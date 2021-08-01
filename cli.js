import yargs from 'yargs';

import index from './index';

yargs
  .command('$0', 'Download a script from MTI reader.',
    (y) => y
      .option('emailAddress', {
        alias: 'e',
        type: 'string',
        description:
          'The contact e-mail address to which Reader access was given.',
      })
      .option('accessCode', {
        alias: 'c',
        type: 'string',
        description:
          'The access code provided by MTI.',
      })
      .option('outputFile', {
        alias: 'o',
        type: 'string',
        description:
          'The path and file name to use for the resulting PDF file.',
      })
      .option('maxPages', {
        type: 'number',
        description:
          'A limit on the number of pages to download. ' +
          'Generally only useful for testing purposes.',
      })
      .demandOption('emailAddress')
      .demandOption('accessCode')
      .demandOption('outputFile'),
    (argv) => index(
      argv.emailAddress, argv.accessCode,
      argv.outputFile, argv.maxPages,
    ),
  )
  .help()
  .strict()
  .argv;
