build:
	@npm run package

act: act-push

act-%: /usr/local/bin/act
	@act $(*)