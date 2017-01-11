# [granary-server](http://gabrielcsapo.github.io/granary-server/) [![Build Status](https://travis-ci.org/gabrielcsapo/granary-server.svg?branch=master)](https://travis-ci.org/gabrielcsapo/granary-server) [![Dependency Status](https://david-dm.org/gabrielcsapo/granary-server.svg)](https://david-dm.org/gabrielcsapo/granary-server) [![devDependency Status](https://david-dm.org/gabrielcsapo/granary-server/dev-status.svg)](https://david-dm.org/gabrielcsapo/granary-server#info=devDependencies)

> based on https://github.com/node-freight/freight-server
> forked and renamed due to lack of culpability in helping add functionality to freight
> hopefully will be able to merge upstream once features and bugs are fixed.

# Screenshots

[screenshots](screenshot)

# Install

```
vagrant up;
vagrant ssh;
npm start;
```

# Contributions

> all contributions are welcome and wanted

## Ways to contribute

- create an issue
    - if the issue is UI related, please provide a screenshot
    - if the issue is code related, please provide code sample that causes this issue (a curl command, etc)
- close an issue or code cleanup
    - branch names should be named `fix-#{issue-number}` if they are fixing an issue
    - branches that are aimed at code cleanup should be labeled `cleanup-{area-of-cleanup}`
    - please run `npm test` and `grunt build` before issuing a PR
