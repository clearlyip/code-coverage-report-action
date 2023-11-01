build: .build-dev.npm
	@npm run package

install: .build-dev.npm
	@echo "noop" > /dev/null

watch: .build-dev.npm
	@npm run watch

test: .build-dev.npm
	@npm run test

lint-fix: .build-dev.npm
	@npm run lint:fix

act: act-schedule act-push

act-pull_request: /usr/bin/gh /usr/local/bin/act /usr/bin/glow build
	@act --bind -e __tests__/pull-request.json -s GITHUB_TOKEN="$(shell gh auth token)" --artifact-server-path /tmp/artifacts pull_request
	@glow code-coverage-results.md
	@rm -Rf code-coverage-results.md

act-%: /usr/bin/gh /usr/local/bin/act /usr/bin/glow build
	@act --bind -s GITHUB_TOKEN="$(shell gh auth token)" --artifact-server-path /tmp/artifacts $(*)
	@glow code-coverage-results.md
	@rm -Rf code-coverage-results.md

/usr/bin/gh:
	@echo "gh is not installed. Please install it from https://cli.github.com/"
	@exit 1

/usr/local/bin/act:
	@echo "act is not installed. Please install it from https://github.com/nektos/act"
	@exit 1

/usr/bin/glow:
	@echo "glow is not installed. Please install it from https://github.com/charmbracelet/glow"
	@exit 1

.build-dev.npm: package-lock.json package.json node_modules
	@npm update
	@touch $@