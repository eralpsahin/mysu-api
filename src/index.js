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

export default mysu;
