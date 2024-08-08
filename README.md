# sf-aws-connect

A new CLI generated with oclif

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/sf-aws-connect.svg)](https://npmjs.org/package/sf-aws-connect)
[![Downloads/week](https://img.shields.io/npm/dw/sf-aws-connect.svg)](https://npmjs.org/package/sf-aws-connect)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g sf-aws-connect
$ sfx COMMAND
running command...
$ sfx (--version)
sf-aws-connect/0.1.4 win32-x64 node-v20.16.0
$ sfx --help [COMMAND]
USAGE
  $ sfx COMMAND
...
```

# Commands

<!-- commands -->

- [`sfx aws-connect download`](#sfx-aws-connect-download)
- [`sfx aws-connect list-instances`](#sfx-aws-connect-list-instances)

## `sfx aws-connect download`

Download components from AWS Connect

```
USAGE
  $ sfx aws-connect download -i <value> -c <value> -o <value> -r <value> [-p <value> | -k <value> | -s <value>]
    [--overrideFile] [-t <value> ]

FLAGS
  -c, --componentType=<value>       (required) Component type to download. Use "Comptype" for all, or "Comptype:Id" for
                                    a single component. Valid types: hoursOfOperation, queues, prompts, flows,
                                    lambda-functions
  -i, --instanceId=<value>          (required) AWS Connect Instance ID
  -k, --accessKeyId=<value>         AWS access key ID
  -o, --outputDir=<value>           (required) Output path for the downloaded component(s)
  -p, --profile=<value>             AWS profile for SSO
  -r, --region=<value>              (required) [default: ap-southeast-2] AWS region
  -s, --secretAccessKey=<value>     AWS secret access key
  -t, --secretSessionToken=<value>  AWS token session key
      --[no-]overrideFile           Override existing files

DESCRIPTION
  Download components from AWS Connect

  Download aws components from AWS Connect instance

EXAMPLES
  $ sfx aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queue --outputPath ./downloads --region ap-southeast-2 --profile dev

  $ sfx aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queue:abcdef-1234-5678-90ab-cdef12345678 --outputPath ./downloads --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY
```

_See code: [src/commands/aws-connect/download.ts](https://github.com/JoeffreyChaucer/sf-aws-connect/blob/v0.1.4/src/commands/aws-connect/download.ts)_

## `sfx aws-connect list-instances`

List all AWS Connect instances

```
USAGE
  $ sfx aws-connect list-instances [-p <value> | -k <value> | -s <value>] [-r <value>] [-t <value> ]

FLAGS
  -k, --accessKeyId=<value>         AWS access key ID
  -p, --profile=<value>             AWS profile for SSO
  -r, --region=<value>              [default: ap-southeast-2] AWS region
  -s, --secretAccessKey=<value>     AWS secret access key
  -t, --secretSessionToken=<value>  AWS token session key

DESCRIPTION
  List all AWS Connect instances

  This command lists all AWS Connect instances in the specified region

EXAMPLES
  $ sfx aws connect list-instances --region ap-southeast-2 --profile dev

  $ sfx aws connect list-instances --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY
```

_See code: [src/commands/aws-connect/list-instances.ts](https://github.com/JoeffreyChaucer/sf-aws-connect/blob/v0.1.4/src/commands/aws-connect/list-instances.ts)_
