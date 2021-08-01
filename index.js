import axios from 'axios';
import fs from 'fs';

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
 * @param {string} sessionInfo
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

  const pageCount = pageData.Scripts[0].PageCount;

  for (let i = 1; i <= Math.min(pageCount, 10); i++) {
    const singlePageResponse = await axios.post(
        'http://ep.mylines.com/BrowseScript.aspx/LoadSinglePage',
        {
          sessionVars: SESSION_VARS,
          pageNum: i,
        });

    /** @type {SinglePage} */
    const singlePage = singlePageResponse.data.d;

    for (const page of singlePage.Pages) {
      fs.writeFileSync(`./temp/page${page.PageNum}.png`,
          page.EncodedFile, {encoding: 'base64'});
    }
  }
}

loadPages().catch(console.error);
