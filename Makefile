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

act-%: /usr/bin/gh /usr/local/bin/act build
	@act -s GITHUB_TOKEN="$(shell gh auth token)" --artifact-server-path /tmp/artifacts $(*)

/usr/bin/gh:
	@echo "gh is not installed. Please install it from https://cli.github.com/"
	@exit 1

/usr/local/bin/act:
	@echo "act is not installed. Please install it from https://github.com/nektos/act"
	@exit 1

.build-dev.npm: package-lock.json package.json node_modules
	@npm update
	@touch $@