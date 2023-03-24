import nodemailer from 'nodemailer';

const sender = process.env.NODEMAILER_EMAIL;
const password = process.env.NODEMAILER_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: sender,
    pass: password,
  },
});

export const sendMail = (to: string, subject: string, text: string) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(
      {
        from: 'jhcao.net',
        to,
        subject,
        text,
      },
      function (error, info) {
        if (error) {
          reject(error);
        } else {
          resolve(info);
          // console.log('Email sent: ' + info.response);
          // do something useful
        }
      }
    );
  });
};
