const axios = require('axios');
const cheerio = require('cheerio');

const instance = axios.create({
  baseURL: 'https://mysu.sabanciuniv.edu/wsdl/mysuapp/v3/',
  headers: { 'Content-Type': 'text/xml' }
});

const bodyOpen = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>`;

const bodyClose = `</soap:Body></soap:Envelope>`;

// Forward API endpoint declaration
const mysu = {
  authenticate: undefined,
  sucard: undefined,
  courseSchedule: undefined
};

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

/**
 * This function authenticates the user to
 * MySU app.
 *
 * Server does not need authentication for other requests.
 * Ultimately, authentication is not needed.
 *
 * @param {string} username - SU-Net username
 * @param {string} password - SU-Net password
 * @returns {Number} Error code of the response
 */
mysu.authenticate = async (username, password) => {
  const body = `${bodyOpen}<checkLogin xmlns="http://tempuri.org/">
              <code>@+PQaUrN8Y[dsF79W</code><uid>${username}</uid>
              <pwd>${password}</pwd></checkLogin>${bodyClose}`;

  const response = await instance.post('/authentication.php', body, {
    transformResponse: data => {
      const $ = cheerio.load(data);
      return +$('errorcode').html();
    }
  });
  return response.data;
};

/**
 * Helper function for mysu.sucard(). Extracts `meals`, `transports`, and `prints` from the XML.
 *
 * @param {string} tag - Appropriate tag for record information.
 *
 * @returns {Array} Array of record object That contains `date`, `product`, `amount`, and `piece`.
 */
const extractInformationFrom = (tag, $) => {
  const data = [];
  const records = tag.children('record');

  records
    .children('date')
    .children()
    .each((i, elem) => {
      data.push({
        date: $(elem)
          .contents()
          .text(),
        product: '',
        amount: '',
        piece: ''
      });
    });

  records
    .children('product')
    .children()
    .each((i, elem) => {
      data[i].product = $(elem)
        .contents()
        .text();
    });

  records
    .children('amount')
    .children()
    .each((i, elem) => {
      data[i].amount = $(elem)
        .contents()
        .text();
    });

  records
    .children('piece')
    .children()
    .each((i, elem) => {
      data[i].piece = $(elem)
        .contents()
        .text();
    });

  return data;
};

/**
 * This function retrieves SuCard transaction records from MySU.
 *
 * @param {string} username - SU-Net username
 *
 * @returns {Object} SuCard transaction record object with `meals`, `transports`, `prints` keys.
 */
mysu.sucard = async username => {
  const body = `${bodyOpen}<getCredits xmlns="http://tempuri.org/">
              <uid>${username}</uid><username>a(#2D8X7quLWZfea=</username>
              <password>;/7.Qcx3sWHnZ7egX</password><student></student>
              <lang>en</lang><trn>1</trn></getCredits>${bodyClose}`;

  const response = await instance.post('/sucard.php', body, {
    transformResponse: data => {
      const $ = cheerio.load(data);
      return {
        meals: extractInformationFrom($('meal'), $),
        transports: extractInformationFrom($('transport'), $),
        prints: extractInformationFrom($('print'), $)
      };
    }
  });
  return response.data;
};

const extractCourse = ($, day, allCourses) => {
  $(day)
    .children('uniqueall')
    .children('item')
    .each((i, elem) => {
      const courseName = $(elem).text();
      if (courseName.search('Recitation') === -1) {
        let codeStarts = courseName.length - 1;
        // Slice title and CDN
        while (courseName.charCodeAt(codeStarts - 1) < 97) codeStarts -= 1;
        const title = courseName.slice(0, codeStarts);
        const CDN = courseName.slice(codeStarts);
        if (!allCourses[CDN]) {
          // eslint-disable-next-line no-param-reassign
          allCourses[CDN] = title;
        }
      }
    });
};

/**
 * This function retrieves Course Schedule of a student.
 *
 * @param {string} username - SU-Net username
 *
 * @returns {Object} Object containing {courseCDN: courseTitle} fields.
 */
mysu.courseSchedule = async username => {
  const body = `${bodyOpen}<getCourseSchedule xmlns="http://tempuri.org/">
            <code>wkU@zs823Wfrn]&amp;Ve</code><uid>${username}</uid>
            <ou>student</ou></getCourseSchedule>${bodyClose}`;

  const response = await instance.post('/courseschedule.php', body, {
    transformResponse: data => {
      const $ = cheerio.load(data);
      const allCourses = {};
      days.forEach(day => extractCourse($, day, allCourses));
      return allCourses;
    }
  });
  return response.data;
};

export default mysu;
