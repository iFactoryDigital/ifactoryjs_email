
// Require dependencies
const uuid       = require('uuid');
const config     = require('config');
const sitemap    = require('sitemap');
const Controller = require('controller');

/**
 * Build Email controller
 *
 * @priority 90
 */
class EmailController extends Controller {
  /**
   * Construct Email controller class
   */
  constructor() {
    // Run super eden
    super();
  }
}

/**
 * Export Email controller
 *
 * @type {EmailController}
 */
exports = module.exports = EmailController;
