const User = require('./users');

const handleError = (res,error) => {
    console.log('Error handling:', error);
    res.status(500).json({error: error.message});
}


const addUser = async (playerName) => {
    try {
        const user = new User({ name: playerName });
        const result = await user.save();
        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = {addUser}