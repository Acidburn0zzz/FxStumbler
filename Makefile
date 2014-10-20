js = lib/leaflet/leaflet.js lib/async_storage.js lib/webL10n/l10n.js js/stumbler.js lib/cluster/cluster.js lib/pako/pako_deflate.js
css = style/form.css style/stumbler.css lib/leaflet/leaflet.css lib/cluster/cluster.css
jscmd := $(shell which uglifyjs2)

.PHONY: help all build zip watch debug update

default: help

help:
	@echo "help   - display this text"
	@echo "all    - compile zip file"

all: build zip

build: 
	test -s lib/webL10n/.git || ( git submodule update --init --recursive && git submodule foreach git pull origin master )
	test -d build || mkdir build
	cat $(css) > build/style.css
ifeq ($(jscmd),)
	cat $(js) > build/build.js
else
	$(jscmd) $(js) \
		-o build/build.js \
		--screw-ie8
endif

debug: 
	test -s lib/webL10n/.git || ( git submodule update --init --recursive && git submodule foreach git pull origin master )
	test -d build || mkdir build
	cat $(css) > build/style.css
ifeq ($(jscmd),)
	cat $(js) > build/build.js
else
	$(jscmd) $(js) \
		-o build/build.js \
		-b indent-level=2 \
		--screw-ie8
endif

zip: 
	rm -f stumbler.zip
	zip -r stumbler.zip index.html js build locales manifest.webapp icons package.manifest

watch:
	while true; do inotifywait -e close_write,moved_to,create,modify $(js) $(css) ; make debug; done

update:
	git submodule foreach git pull origin master
