import axios from 'axios';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const SESSION_VARS = process.env.SESSION_VARS;

/**
 * @typedef {object} Page
 * @property {number} PageNum
 * @property {string} EncodedFile
 */

/**
 * @typedef {object} Script
 * @property {number} Id
 * @property {Number} PageCount
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
 * @param {string} sessionInfo
 * @return {DownloadedPage[]}
 */
async function loadPages(sessionInfo) {
  const pageDataResponse = await axios.post(
      'http://ep.mylines.com/BrowseScript.aspx/LoadPageData',
      {
        sessionVars: SESSION_VARS,
        numPagesToLoad: 1,
      });

  /** @type {PageData} */
  const pageData = pageDataResponse.data.d;

  const pageCount = Math.min(pageData.Scripts[0].PageCount, 10);

  /** @type {DownloadedPage[]} */
  const pages = [];

  for (let i = 1; i <= pageCount; i++) {
    console.log(`Downloading page ${i} of ${pageCount}`);

    const singlePageResponse = await axios.post(
        'http://ep.mylines.com/BrowseScript.aspx/LoadSinglePage',
        {
          sessionVars: SESSION_VARS,
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
  }

  return pages;
}

/**
 * @param {DownloadedPage[]} pages
 */
async function generatePdf(pages) {
  const pdf = new PDFDocument({autoFirstPage: false});
  pdf.pipe(fs.createWriteStream('./temp/result.pdf'));

  pages = pages.sort((a, b) => a.number - b.number);

  for (const page of pages) {
    const buffer = Buffer.from(page.data, 'base64');
    const image = pdf.openImage(buffer);
    pdf.addPage({size: [image.width, image.height]});
    pdf.image(image, 0, 0);
  }

  pdf.end();
}

loadPages().then(generatePdf).catch(console.error);
