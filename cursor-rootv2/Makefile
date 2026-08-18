.PHONY: test typecheck install build bundle compile compile-linux compile-macos

install:
	npm install

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build

bundle:
	npm run build:bundle

compile:
	npm run compile

compile-linux:
	npm run compile:linux

compile-macos:
	npm run compile:macos

check: test typecheck
