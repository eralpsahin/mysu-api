const axios = require('axios');
const cheerio = require('cheerio');

const instance = axios.create({
  baseURL: 'https://mysu.sabanciuniv.edu/wsdl/mysuapp/v3/',
  headers: { 'Content-Type': 'text/xml' }
});

const mysu = {};

/**
 * This function authenticates the user to
 * MySU app.
 *
 * Server does not need authentication for other requests.
 * Ultimately, authentication is not needed.
 *
 * @param {string} username SU-Net username
 * @param {string} password SU-Net password
 * @returns {Number} Error code of the response
 */
mysu.authenticate = async (username, password) => {
  const body = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
          <checkLogin xmlns="http://tempuri.org/">
              <code>@+PQaUrN8Y[dsF79W</code>
              <uid>${username}</uid>
              <pwd>${password}</pwd>
          </checkLogin>
      </soap:Body>
    </soap:Envelope>`;

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
 * @param {string} username SU-Net username
 *
 * @returns {Object} SuCard transaction record object with `meals`, `transports`, `prints` keys.
 */
mysu.sucard = async username => {
  const body = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
          <getCredits xmlns="http://tempuri.org/">
              <uid>${username}</uid>
              <username>a(#2D8X7quLWZfea=</username>
              <password>;/7.Qcx3sWHnZ7egX</password>
              <student>true</student>
              <lang>en</lang>
              <trn>1</trn>
        </getCredits>
      </soap:Body>
    </soap:Envelope>`;

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

export default mysu;
