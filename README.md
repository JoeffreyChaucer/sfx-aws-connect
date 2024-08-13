# sf-aws-connect

A new CLI generated with oclif

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/sf-aws-connect.svg)](https://npmjs.org/package/sf-aws-connect)
[![Downloads/week](https://img.shields.io/npm/dw/sf-aws-connect.svg)](https://npmjs.org/package/sf-aws-connect)

<!-- toc -->

- [sf-aws-connect](#sf-aws-connect)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g sf-aws-connect-dev
$ sf-aws-connect COMMAND
running command...
$ sf-aws-connect (--version)
sf-aws-connect/0.1.0 win32-x64 node-v20.16.0
$ sf-aws-connect --help [COMMAND]
USAGE
  $ sf-aws-connect COMMAND
...
```

# Commands

<!-- commands -->

- [`sf-aws-connect download`](#sf-aws-connect-download)
- [`sf-aws-connect list-instances`](#sf-aws-connect-list-instances)
- [`sf-aws-connect help [COMMAND]`](#sf-aws-connect-help-command)

## `sf-aws-connect download`

Download components from AWS Connect

```
USAGE
  $ sf-aws-connect download -i <value> -c <value> -o <value> -r <value> [-p <value> | -k <value> | -s <value>]
    [--overrideFile] [-t <value> ]

FLAGS
  -c, --componentType=<value>       (required) Component type to download. Use "Comptype" for all, or "Comptype:Id" for
                                    a single component.
                                    Valid types:
                                    all,
                                    hoursOfOperation,
                                    queues,
                                    prompts,
                                    contactFlows,
                                    routingProfiles,
                                    agentStatus,
                                    lambdaFunctions
  -i, --instanceId=<value>          (required) AWS Connect Instance ID
  -k, --accessKeyId=<value>         AWS access key ID
  -o, --outputDir=<value>           (required) Output path for the downloaded component(s)
  -p, --profile=<value>             AWS profile for SSO
  -r, --region=<value>              (required) [default: ap-southeast-2] AWS region
  -s, --secretAccessKey=<value>     AWS secret access key
  -t, --secretSessionToken=<value>  AWS token session key
      --[no-]overWrite              overWrite existing components

DESCRIPTION
  Download components from AWS Connect

  Download aws components from AWS Connect instance

EXAMPLES
  $ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queues --outputPath ./downloads --region ap-southeast-2 --profile dev

  $ sf-aws-connect download --instanceId 12345678-1234-1234-1234-123456789012 --componentType queues:abcdef-1234-5678-90ab-cdef12345678 --outputPath ./downloads --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY  --secretSessionToken YOUR_SESSION_KEY
```

_See code: [src/commands/download.ts](https://github.com/JoeffreyChaucer/sfx-aws-connect/blob/v0.1.0/src/commands/download.ts)_

## `sf-aws-connect help [COMMAND]`

Display help for sf-aws-connect.

```
USAGE
  $ sf-aws-connect help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for sf-aws-connect.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.7/src/commands/help.ts)_

## `sf-aws-connect list-instances`

List all AWS Connect instances

```
USAGE
  $ sf-aws-connect list-instances [-p <value> | -k <value> | -s <value>] [-r <value>] [-t <value> ]

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
  $ sf-aws-connect list-instances --region ap-southeast-2 --profile dev

  $ sf-aws-connect list-instances --region ap-southeast-2 --accessKeyId YOUR_ACCESS_KEY --secretAccessKey YOUR_SECRET_KEY  --secretSessionToken YOUR_SESSION_KEY
```

_See code: [src/commands/list-instances.ts](https://github.com/JoeffreyChaucer/sfx-aws-connect/blob/v0.1.0/src/commands/list-instances.ts)_
