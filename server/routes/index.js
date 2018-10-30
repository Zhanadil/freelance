const router = module.exports = require('express').Router();

router.use('/admin', require('@routes/admin'));
router.use('/student', require('@routes/student'));
router.use('/company', require('@routes/company'));
router.use('/', require('@routes/general'));
