const express = require('express');
const {getUser,deleteUser,addUser,} = require('./user-controller');
const router = express.Router();

router.get('/users/:id', getUser);
router.delete('/users/:id', deleteUser);
router.post('/users',addUser);

module.exports = router;