# harbor-roboteer GitHub Action

GitHub Action to create a Harbor robot account using GitHub OIDC via
[harbor-roboteer](https://github.com/RiskIdent/harbor-roboteer).

## Usage

```yaml
on:
  pull_request:

jobs:
  docker-pull:
    runs-on: ubuntu-latest

    permissions:
      id-token: write # This is required for requesting the JWT

    steps:
      - name: Login to Harbor
        uses: RiskIdent/harbor-roboteer-action@v1
        with:
          harbor-url: https://harbor.example.com
          setup-docker-auth: true

      - name: Try pull image
        run: |
          docker pull harbor.example.com/foo/bar
```

## Inputs

See [./action.yml](./action.yml)

## Development

### Building

Recommended: use [mise](https://mise.jdx.dev/)

```bash
mise run all
```

> `dist/*` files should be included in the commit.

### mise

Mise (aka "mise-en-place") is used to manage tooling to make sure we have the
same version of everything.

Recommended to set up automatic activation:

```bash
# for bash
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
# for zsh
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
# for fish
echo 'mise activate fish | source' >> ~/.config/fish/config.fish
```

### pre-commit via hk

Recommended to use our pre-commit hooks, provided via [hk](https://hk.jdx.dev/)

```bash
# if using Git 2.54+ (check with "git --version"), then it's recommended to install globally
mise run pre-commit:install:global

# otherwise:
mise run pre-commit:install
```
