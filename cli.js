import yargs from 'yargs';

import index from './index';

yargs
  .command('$0', 'Download a script from MTI reader.',
    (y) => y
      .option('sessionVars', {
        alias: 's',
        type: 'string',
        description:
          'The value of the sessionVars variable passed to data requests. ' +
          'Extract from Inspector when reader scripts in a browser.',
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
      .demandOption('session-vars')
      .demandOption('output-file'),
    (argv) => index(argv.sessionVars, argv.outputFile, argv.maxPages),
  )
  .help()
  .strict()
  .argv;
