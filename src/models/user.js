class User {
  constructor({ id, first_name, last_name, email, phone_number, password }) {
    this.id = id;
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
    this.phone_number = phone_number;
    this.password = password;
  }
}

module.exports = User;