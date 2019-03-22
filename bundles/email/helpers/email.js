// Require dependencies
const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');

// Require local class dependencies
const Helper = require('helper');

// Require models
const File  = model('file');
const Email = model('email');
const Image = model('image');

// Require local dependencies
const config = require('config');
const view   = require('lib/eden/view');

/**
 * Create Email Helper class
 */
class EmailHelper extends Helper {
  /**
   * Construct Email Helper class
   */
  constructor() {
    // Run super
    super();

    // Build mailer
    this.mailer = nodemailer.createTransport(config.get('email'), {
      from : config.get('email.from') || config.get('email.auth.user'),
    });
  }

  /**
   * Sends text to user
   *
   * @param   {string} addresses
   * @param   {string} template
   * @param   {object} data
   *
   * @returns {Email}
   *
   * @async
   */
  async send(addresses, template, data) {
    // Make sure addresses is array
    if (!Array.isArray(addresses)) addresses = [addresses];

    // check attachments
    if (data.attachments) {
      // do attachments
      data.attachments = await Promise.all(data.attachments.map(async (attachment) => {
        // get attachment
        if (attachment instanceof File || attachment instanceof Image) {
          // return attachment
          return {
            path     : `https://localhost:${config.get('port')}${await attachment.url()}`,
            filename : attachment.get('name'),
          };
        }

        // return attachment
        return attachment;
      }));
    }

    // Create text
    const email = new Email({
      data,
      from     : data.from || config.get('email.from') || config.get('email.auth.user'),
      sent     : false,
      emails   : addresses,
      subject  : data.subject || 'No Subject',
      template,
    });

    console.log(email.get());

    // Save text
    await email.save();

    // Compile html
    let html = '';

    // Add html content
    html += '<!DOCTYPE html>';
    html += '<html dir="ltr">';
    html += '<head>';
    html += '<meta charset="utf-8">';
    html += '<meta name="viewport" content="width=device-width">';
    html += '<meta http-equiv="X-UA-Compatible" content="IE=edge">';
    html += '<meta name="x-apple-disable-message-reformatting">';
    html += `<title>${config.get('title')} - ${email.get('subject')}</title>`;
    html += '</head>';
    html += '<body leftmargin="0" marginwidth="0" topmargin="0" marginheight="0" offset="0">';

    // Get email template
    html += await view.email(template, email.get('data'));

    // End body
    html += '</body>';
    html += '</html>';

    // Options
    const options = {
      to   : email.get('emails').join(', '),
      from : email.get('from'),
      html,
      text : data.text || htmlToText.fromString(html, {
        wordwrap : 130,
      }),
      subject : data.subject,
    };

    // Loop data
    for (const key in data) {
      // Check key doesnt exist
      if (!options[key]) options[key] = data[key];
    }

    // Run email send hook
    await this.eden.hook('email.send', {
      email,
      options,
    });

    // Run try/catch
    try {
      // Send mail with defined transport object
      const info = await new Promise((resolve, reject) => {
        // Send mail
        this.mailer.sendMail(options, (err, info) => {
          // Check error
          if (err) return reject(err);

          // Resolve
          resolve(info);
        });
      });

      // Set sent
      email.set('sent', true);
      email.set('success', info.messageId);

      // Save email
      await email.save();
    } catch (e) {
      // Log error
      this.logger.log('error', e.toString());

      // Set error
      email.set('error', e.toString());

      // Save email
      await email.save();
    }

    // Return email
    return email;
  }
}

/**
 * Export new Email Helper instance
 *
 * @return {EmailHelper}
 */
exports = module.exports = new EmailHelper();
