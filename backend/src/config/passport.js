// Hiện tại tạm thời bỏ qua file này vì đã dùng thư viện OAuth2 khác
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('@models/User');
// require('dotenv').config();

// passport.serializeUser((user, done) => {
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (err) {
//         done(err, null);
//     }
// });

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: '/auth/google/callback',
//         },
//         async (accessToken, refreshToken, profile, done) => {
//             try {
//                 const email = profile.emails?.[0]?.value;
//                 if (!email) {
//                     return done(new Error('Không thể lấy email từ Google profile'), null);
//                 }

//                 // Tìm user theo email
//                 const existingUser = await User.findByEmail(email);

//                 if (!existingUser) {
//                     // Email chưa được đăng ký trong hệ thống
//                     const error = new Error(
//                         'Tài khoản chưa được đăng ký. Vui lòng đăng ký trước khi đăng nhập bằng Google.'
//                     );
//                     error.type = 'ACCOUNT_NOT_REGISTERED';
//                     error.email = email;
//                     return done(error, null);
//                 }

//                 // Nếu user đã có googleId, đăng nhập thành công
//                 if (existingUser.googleId === profile.id) {
//                     return done(null, existingUser);
//                 }

//                 // Nếu user chưa có googleId, liên kết tài khoản Google
//                 const updatedUser = await User.updateUser(existingUser.id, {
//                     googleId: profile.id,
//                     avatar: profile.photos?.[0]?.value || existingUser.avatar,
//                 });
//                 return done(null, updatedUser);
//             } catch (err) {
//                 return done(err, null);
//             }
//         }
//     )
// );
