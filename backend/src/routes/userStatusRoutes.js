const router = require('express').Router();
const ctrls = require('@src/controllers/userStatusController');
const tokenUtils = require('@src/middlewares/jwt');

router.get('/status/:userId', tokenUtils.verifyAccessToken, ctrls.getUserStatus);
router.get('/status', tokenUtils.verifyAccessToken, ctrls.getAllUserStatuses);

module.exports = router;
