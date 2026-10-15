{
  description = "Cinema Bergamo — programmazione unificata di UCI Orio, Arcadia Stezzano e Notorious Curno";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      lib = nixpkgs.lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
          ];
          shellHook = ''
            echo "🎬  Cinema Bergamo — dev shell"
            echo "    node $(node --version) · npm $(npm --version)"
            echo "    npm install && npm run dev   # server :8787 + web :5173"
          '';
        };
      });

      packages = forAllSystems (pkgs: rec {
        default = cinema-bergamo;

        cinema-bergamo = pkgs.buildNpmPackage {
          pname = "cinema-bergamo";
          version = "1.0.0";

          # only sources, no node_modules/dist/.git
          src = lib.cleanSourceWith {
            src = ./.;
            filter =
              path: _type:
              let
                base = baseNameOf path;
              in
              !(builtins.elem base [
                "node_modules"
                "dist"
                ".git"
              ]);
          };

          nodejs = pkgs.nodejs_24;
          npmDepsHash = "sha256-KtrP0YAP6N9AFQ6UpZ1yzQFA4CvgAjG9wBcgtiUpR24=";

          # `npm run build` (root workspaces) -> web/dist + server/dist
          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib/cinema-bergamo

            # drop build-only dependencies, keep runtime (express)
            npm prune --omit=dev --no-audit --no-fund

            cp -r package.json server web node_modules $out/lib/cinema-bergamo/

            mkdir -p $out/bin
            cat > $out/bin/cinema-bergamo <<'EOF'
            #!${pkgs.runtimeShell}
            export PORT="''${PORT:-8787}"
            exec ${pkgs.nodejs_24}/bin/node "${placeholder "out"}/lib/cinema-bergamo/server/dist/index.js" "$@"
            EOF
            chmod +x $out/bin/cinema-bergamo
            runHook postInstall
          '';

          meta = {
            description = "Frontend/aggregatore della programmazione dei cinema di Bergamo";
            mainProgram = "cinema-bergamo";
          };
        };
      });

      apps = forAllSystems (pkgs: {
        default = {
          type = "app";
          program = "${self.packages.${pkgs.stdenv.hostPlatform.system}.default}/bin/cinema-bergamo";
          meta.description = "Avvia il server di Cinema Bergamo (frontend + API)";
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt);
    };
}
