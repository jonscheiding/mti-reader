import axios from 'axios';
import fs from 'fs';
import PDFDocument from 'pdfkit';

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

  if (maxPages) {
    console.log(`Found ${pageCount} pages, limiting to ${maxPages}.`);
    pageCount = Math.min(pageCount, maxPages);
  } else {
    console.log(`Found ${pageCount} pages.`);
  }

  /** @type {DownloadedPage[]} */
  const pages = [];

  for (let i = 1; i <= pageCount; i++) {
    console.log(`Downloading page ${i} of ${pageCount}`);

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
  }

  return pages;
}

/**
 * @param {string} outputFile
 * @param {DownloadedPage[]} pages
 */
async function generatePdf(outputFile, pages) {
  const pdf = new PDFDocument({autoFirstPage: false});
  pdf.pipe(fs.createWriteStream(outputFile));

  pages = pages.sort((a, b) => a.number - b.number);

  for (const page of pages) {
    const buffer = Buffer.from(page.data, 'base64');
    const image = pdf.openImage(buffer);
    pdf.addPage({size: [image.width, image.height]});
    pdf.image(image, 0, 0);
  }

  pdf.end();
}

/**
 * @param {string} sessionVars
 * @param {string} outputFile
 * @param {number} maxPages
 */
export default async function index(sessionVars, outputFile, maxPages) {
  const pages = await loadPages(sessionVars, maxPages);
  await generatePdf(outputFile, pages);
}
