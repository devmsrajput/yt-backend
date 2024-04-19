import { APIError } from "../utils/APIError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

// Validates user fields
const fullNameRegex = /^[a-zA-Z\s'-]{4,}$/;
const usernameRegex = /^[a-zA-Z0-9_]{4,}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;


// Validate video fields:
const titleRegex = /^[a-zA-Z0-9\s.,!?'"()_-]{4,}$/
const descriptionRegex = /^[\w\s.,!?'"()_-]{4,}$/


const validateInput = (input, regex) => {
    return regex.test(input);
};


export const validationMiddleware = AsyncHandler(async (req, res, next) => {
  if (req.path === "/signup") {
    const { fullName, username, email, password } = req.body;

    if (!validateInput(username, usernameRegex)) {
      const warning = `
- Usernames must contain at least 4 characters.
- Spaces are not permitted in usernames.
- Valid characters include alphabets, numbers, and underscores.
`;
      req.validationWarning = warning;
      req.validate = false;
      next();
    }

    if (!validateInput(fullName, fullNameRegex)) {
      const warning = `
- Full names must contain at least 4 characters.
- Spaces, hyphens, and apostrophes are allowed.
- Only alphabets are permitted (no numbers or special characters).
`;
      req.validationWarning = warning;
      req.validate = false;
      next();
    }

    if (!validateInput(email, emailRegex)) {
      const warning = `
Please note the following criteria for valid email addresses:
    - The email address must follow the standard format: username@domain.com.
    - Valid characters for the username part include:
        Alphabets (both uppercase and lowercase)
        Numbers
        Underscores (_)
        Percent signs (%)
        Plus signs (+)
        Hyphens (-)
        Periods (.)
    - The domain part must have at least two characters (e.g., .com, .org, .net).
    - The email address should not start or end with a period (.).
    - Double-check that there are no spaces within the email address.
`;
      req.validationWarning = warning;
      req.validate = false;
      next();
    }

    if (!validateInput(password, passwordRegex)) {
      const warning = `Please adhere to the following password criteria:
- The password must be at least 8 characters long.
- It should contain:
    At least one uppercase letter.
    At least one lowercase letter.
    At least one digit (0-9).
- Only alphabets (both uppercase and lowercase) and digits are allowed.
`;
      req.validationWarning = warning;
      req.validate = false;
      next();
    }
    req.validate = true;
    next();
  }



  if(req.path === '/change-password'){
    const {newPassword} = req.body
    if (!validateInput(newPassword, passwordRegex)) {
        const warning = `Please adhere to the following password criteria:
  - The password must be at least 8 characters long.
  - It should contain:
      At least one uppercase letter.
      At least one lowercase letter.
      At least one digit (0-9).
  - Only alphabets (both uppercase and lowercase) and digits are allowed.
  `;
        req.validationWarning = warning;
        req.validate = false;
        next();
    }
    req.validate = true
    next();
  }


  if(req.path === '/update-profile'){
    const {fullName, email} = req.body
    if (!validateInput(fullName, fullNameRegex)) {
        const warning = `
  - Full names must contain at least 4 characters.
  - Spaces, hyphens, and apostrophes are allowed.
  - Only alphabets are permitted (no numbers or special characters).
  `;
        req.validationWarning = warning;
        req.validate = false;
        next();
    }

    if (!validateInput(email, emailRegex)) {
        const warning = `
  Please note the following criteria for valid email addresses:
      - The email address must follow the standard format: username@domain.com.
      - Valid characters for the username part include:
          Alphabets (both uppercase and lowercase)
          Numbers
          Underscores (_)
          Percent signs (%)
          Plus signs (+)
          Hyphens (-)
          Periods (.)
      - The domain part must have at least two characters (e.g., .com, .org, .net).
      - The email address should not start or end with a period (.).
      - Double-check that there are no spaces within the email address.
  `;
        req.validationWarning = warning;
        req.validate = false;
        next();
      }

    req.validate = true
    next();
  }


  if(req.path === '/upload-video'){
    const {title, description} = req.body

    if(!validateInput(title, titleRegex)){
      const warning = 
`
Title may have alphanumeric characters, spaces, and common punctuation marks and minimum 4 characters.
`
      req.validationWarning = warning;
      req.validate = false;
      next();
    }

    if(!validateInput(description, descriptionRegex)){
      const warning = 
`
Description may have word characters (alphanumeric or underscore), spaces, and common punctuation marks and minimum 4 characters.
`
      req.validationWarning = warning;
      req.validate = false;
      next();
    }


    req.validate = true
    next()
  }

//   let upath = req.path
//   upath = upath.split('/')
//   upath = upath[1]
//   console.log(req.path)
//   if(String(upath) === 'update-video'){
//     const {title, description} = req.body

//     if(!validateInput(title, titleRegex)){
//       const warning = 
// `
// Title may have alphanumeric characters, spaces, and common punctuation marks and minimum 4 characters.
// `
//       req.validationWarning = warning;
//       req.validate = false;
//       next();
//     }

//     if(!validateInput(description, descriptionRegex)){
//       const warning = 
// `
// Description may have word characters (alphanumeric or underscore), spaces, and common punctuation marks and minimum 4 characters.
// `
//       req.validationWarning = warning;
//       req.validate = false;
//       next();
//     }


//     req.validate = true
//     next()
//   }
});