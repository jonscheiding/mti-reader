import axios from 'axios';
import fs from 'fs';
import Nightmare from 'nightmare';
import PDFDocument from 'pdfkit';
import prottle from 'prottle';

/**
 * @typedef {object} Page
 * @property {number} PageNum
 * @property {string} EncodedFile
 */

/**
 * @typedef {object} Script
 * @property {number} PageCount
 * @property {string} ProductionName
 */

/**
 * @typedef {object} PageData
 * @property {Page[]} Pages
 * @property {Script[]} Scripts
 */

/**
 * @typedef {object} SinglePage
 * @property {Page[]} Pages
 */

/**
 * @typedef {object} DownloadedPage
 * @property {number} number
 * @property {string} data
 */


/**
 * @param {number} current
 * @param {number} total
 */
function writeProgress(current, total) {
  process.stdout.write('.');
  if (current % 50 === 0 || current === total) {
    process.stdout.write(` (${
      Math.floor(current * 100 / total)
    }%)\n`);
  }
}

/**
 * @param {string} emailAddress
 * @param {string} accessCode
 */
async function getSessionVars(emailAddress, accessCode) {
  console.log(`Retrieving session vars for '${emailAddress}' ` +
  `with access code '${accessCode}'.`);

  const nightmare = new Nightmare();

  const browseUrl = await nightmare
    .goto('https://reader.mtishows.com')
    .type('#accessCode', accessCode)
    .type('#contactEmail', emailAddress)
    .click('#Submit')
    .wait('#ScriptFrame')
    .wait(1000)
    .evaluate(() => document.querySelector('#ScriptFrame').src);

  console.log(`Browsing script at '${browseUrl}'.`);

  const sessionVars = await nightmare
    .goto(browseUrl)
    .wait('#HdnSessionVars')
    .evaluate(() => document.querySelector('#HdnSessionVars').value)
    .end();

  console.log(`Retrieved session vars '${sessionVars}'.`);
  return sessionVars;
}

/**
 * @param {string} sessionVars
 * @param {number} maxPages
 * @return {DownloadedPage[]}
 */
async function loadPages(sessionVars, maxPages) {
  const pageDataResponse = await axios.post(
    'http://ep.mylines.com/BrowseScript.aspx/LoadPageData',
    {
      sessionVars,
      numPagesToLoad: 1,
    });

  /** @type {PageData} */
  const pageData = pageDataResponse.data.d;

  let pageCount = Math.min(pageData.Scripts[0].PageCount);

  console.log(`Getting script for '${pageData.Scripts[0].ProductionName}'.`);

  if (maxPages) {
    console.log(`Downloading ${maxPages} (${pageCount} total pages found).`);
    pageCount = Math.min(pageCount, maxPages);
  } else {
    console.log(`Downloading ${pageCount} pages.`);
  }

  /** @type {DownloadedPage[]} */
  const pages = [];
  /** @type {Promise[]} */
  const pagePromises = [];

  for (let i = 1; i <= pageCount; i++) {
    pagePromises.push(async () => {
      writeProgress(i, pageCount);

      const singlePageResponse = await axios.post(
        'http://ep.mylines.com/BrowseScript.aspx/LoadSinglePage',
        {
          sessionVars,
          pageNum: i,
        });

      /** @type {SinglePage} */
      const singlePage = singlePageResponse.data.d;

      for (const page of singlePage.Pages) {
        pages.push({
          number: page.PageNum,
          data: page.EncodedFile,
        });
      }
    });
  }

  await prottle(20, pagePromises);

  return pages;
}

/**
 * @param {string} outputFile
 * @param {DownloadedPage[]} pages
 */
async function generatePdf(outputFile, pages) {
  console.log('Generating PDF.');

  const pdf = new PDFDocument({autoFirstPage: false});
  pdf.pipe(fs.createWriteStream(outputFile));

  pages = pages.sort((a, b) => a.number - b.number);

  for (let i = 0; i < pages.length; i++) {
    const buffer = Buffer.from(pages[i].data, 'base64');
    const image = pdf.openImage(buffer);
    pdf.addPage({size: [image.width, image.height]});
    pdf.image(image, 0, 0);

    writeProgress(i + 1, pages.length);
  }

  console.log(`Saving PDF as '${outputFile}'.`);
  pdf.end();
}

/**
 * @param {string} emailAddress
 * @param {string} accessCode
 * @param {string} outputFile
 * @param {number} maxPages
 */
export default async function index(
  emailAddress, accessCode, outputFile, maxPages,
) {
  const sessionVars = await getSessionVars(emailAddress, accessCode);
  const pages = await loadPages(sessionVars, maxPages);
  await generatePdf(outputFile, pages);
}
