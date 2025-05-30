const mongoose = require('mongoose');
const crypto = require('crypto');

const studentSchema = new mongoose.Schema({
  studentNumber: {
    type: String,
    trim: true,
    unique: true,
    required: 'studentNumber is required'
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
    required: 'Email is required'
  },
  program: {
    type: String,
    trim: true
  },
  hobbies: {
    type: String,
    trim: true
  },
  techSkills: {
    type: String,
    trim: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  updated: {
    type: Date,
    default: Date.now
  },
  hashed_password: {
    type: String,
    required: 'Password is required'
  },
  salt: String
});

studentSchema.virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
    console.log(this.hashed_password);
  })
  .get(function() {
    return this._password;
  });

studentSchema.path('hashed_password').validate(function(v) {
  if (this._password && this._password.length < 6) {
    this.invalidate('password', 'Password must be at least 6 characters.');
  }
  if (this.isNew && !this._password) {
    this.invalidate('password', 'Password is required');
  }
}, null);

studentSchema.methods = {
  authenticate: function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },
  encryptPassword: function(password) {
    if (!password) return '';
    try {
      return crypto
        .createHmac('sha1', this.salt)
        .update(password)
        .digest('hex');
    } catch (err) {
      console.log(err);
      return '';
    }
  },
  makeSalt: function() {
    return Math.round(new Date().valueOf() * Math.random()) + '';
  }
};

// Export the Student model
const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
