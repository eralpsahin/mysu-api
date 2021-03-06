const axios = require('axios');
const cheerio = require('cheerio');

// Boilerplate SOAP data for requests.
const bodyOpen = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>`;
const bodyClose = `</soap:Body></soap:Envelope>`;

// Weekday array for Su Card information parsing.
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

/**
 * Helper function for mysu.sucard(). Extracts `meals`, `transports`, and `prints` from the XML.
 * @private
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
 * Helper function for parsing course information.
 * @private
 * @param {Cheerio} $ - Cheerio object with loaded XML.
 * @param {String} day - Name of the day all lowercase.
 * @param {*} allCourses - Object that stores all the courses.
 */
const extractCourse = ($, day, allCourses) => {
  $(day)
    .children('uniqueall')
    .children('item')
    .each((i, elem) => {
      const courseName = $(elem).text();
      if (
        courseName.search('Recit') === -1 &&
        courseName.search('Discus') === -1 &&
        courseName.search('Lab') === -1
      ) {
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
 * Helper function for parsing person information.
 * @private
 * @param {Cheerio} $ - Cheerio object with loaded XML.
 * @returns {Array} Array of person objects containing username,
 * name, birthday, photo, degree, program fields for the person.
 */
const extractPersonInfoFrom = $ => {
  const ids = [];
  const people = {};
  $('email')
    .children()
    .each((i, elem) => {
      let username = $(elem).text();
      username = username.slice(0, username.indexOf('@'));
      ids.push(username);
      people[username] = {};
    });

  $('name')
    .children()
    .each((i, elem) => {
      people[ids[i]].name = $(elem).text();
    });
  $('birthdayprefix')
    .children()
    .each((i, elem) => {
      people[ids[i]].birthday = $(elem).text();
    });
  $('photo')
    .children()
    .each((i, elem) => {
      people[ids[i]].photo = $(elem).text();
    });
  $('degree')
    .children()
    .each((i, elem) => {
      people[ids[i]].degree = $(elem).text();
    });
  $('program')
    .children()
    .each((i, elem) => {
      people[ids[i]].program = $(elem).text();
    });

  const usernames = Object.keys(people);
  const peopleArr = [];
  for (let i = 0; i < usernames.length; i += 1) {
    const username = usernames[i];
    peopleArr.push({
      username,
      ...people[username]
    });
  }
  return peopleArr;
};

class MySU {
  constructor(config) {
    const { bypassCORS } = config;

    this.instance = axios.create({
      baseURL: `https:/${
        bypassCORS ? '/cors-anywhere.herokuapp.com' : ''
      }/mysu.sabanciuniv.edu/wsdl/mysuapp/v3/`,
      headers: {
        'Content-Type': 'text/xml',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  }

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
  async authenticate(username, password) {
    const body = `${bodyOpen}<checkLogin xmlns="http://tempuri.org/">
              <code>@+PQaUrN8Y[dsF79W</code><uid>${username}</uid>
              <pwd>${password}</pwd></checkLogin>${bodyClose}`;

    const response = await this.instance.post('authentication.php', body, {
      transformResponse: data => {
        const $ = cheerio.load(data);
        return +$('errorcode').html();
      }
    });
    return response.data;
  }

  /**
   * This function retrieves SuCard transaction records from MySU.
   *
   * @param {string} username - SU-Net username
   *
   * @returns {Object} SuCard transaction record object with `meals`, `transports`, `prints` keys.
   */
  async sucard(username) {
    const body = `${bodyOpen}<getCredits xmlns="http://tempuri.org/">
              <uid>${username}</uid><username>a(#2D8X7quLWZfea=</username>
              <password>;/7.Qcx3sWHnZ7egX</password><student></student>
              <lang>en</lang><trn>1</trn></getCredits>${bodyClose}`;

    const response = await this.instance.post('sucard.php', body, {
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
  }

  /**
   * This function retrieves Course Schedule of a student.
   *
   * @param {string} username - SU-Net username
   *
   * @returns {Object} Object containing {courseCDN: courseTitle} fields.
   */
  async courseSchedule(username) {
    const body = `${bodyOpen}<getCourseSchedule xmlns="http://tempuri.org/">
            <code>wkU@zs823Wfrn]&amp;Ve</code><uid>${username}</uid>
            <ou>student</ou></getCourseSchedule>${bodyClose}`;

    const response = await this.instance.post('courseschedule.php', body, {
      transformResponse: data => {
        const $ = cheerio.load(data);
        const allCourses = {};
        days.forEach(day => extractCourse($, day, allCourses));
        return allCourses;
      }
    });
    return response.data;
  }

  /**
   * @param {String} search - Search string.
   * @param {String} [type="student"] - Peoples type: alumni - student - staff.
   * @param {(string|number)} [limit=""] - Limit the number of people returned.
   * @param {(string|number)} [start=0] - Return the people starting from start index.
   * @returns {Array} Array of person objects as in the example above.
   */
  async getPerson(search, type = 'student', limit = '', start = 0) {
    const body = `${bodyOpen}<people xmlns="http://tempuri.org/">
            <code>su2013people</code><ou>staff</ou>
            <lang>en</lang><like>
            ${Buffer.from(search).toString('base64')}
            </like><liketype>${type}</liketype><limit>${limit}</limit>
            <more>${start}</more>
            </people>${bodyClose}`;

    const response = await this.instance.post('/people_v2.php', body, {
      transformResponse: data => {
        const $ = cheerio.load(data, { xmlMode: true });
        return extractPersonInfoFrom($);
      }
    });
    return response.data;
  }
}

module.exports = MySU;
