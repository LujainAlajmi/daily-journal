//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const port = process.env.PORT || 3000;
const homeStartingContent = "";
const changeRoute = "";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
mongoose.connect(
 process.env.DB_LINK
);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const postsSchema = new mongoose.Schema({
  title: String,
  content: String,
  username:String
});
const userSchema = new mongoose.Schema({
  // email: String,
  password: String,
  googleId: String,
  username: String,
  firstname:String,
  post: String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);
const Post = new mongoose.model("Post", postsSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id, username: profile._json.email, firstname: profile.displayName}, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile","email"] })
);

app.get(
  "/auth/google/home",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  }
);

app.get("/", function (req, res) {
  res.redirect("/home");
});
app.get("/login", function (req, res) {
  res.render("login",{changeRoute: "login"});
});

app.get("/register", function (req, res) {
  res.render("register", {changeRoute: "login"});
});



app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/home");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/home");
      });
    }
  });
});



app.get("/home", function (req, res) {
  if (req.isAuthenticated()) {
  
    Post.find({username: req.user.username}, function (err, foundPosts) {
    if (err) {
      console.log(err);
    } else {
      
      res.render("home", { startingContent: req.user.firstname, posts: foundPosts, changeRoute: "logout" });
    }
  });
  } else {
    res.redirect("/login");
  }  
});

app.get("/about", function(req, res) {
  res.render("about", {
    aboutContent: aboutContent
  });

});

app.get("/contact", function (req, res) {
  
  res.render("contact", {
    contactContent: contactContent
  });
});

app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("compose",{changeRoute: "logout"});
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function (req, res) {

  const submittedTitle = req.body.postTitle;
  
User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.post = submittedTitle;
        const post = new Post({
        title: req.body.postTitle,
          content: req.body.postBody,
          username: req.user.username
        });
        post.save();
        foundUser.save(function () {
        res.redirect("/home");
        });
      }
    }
  });
});



app.get("/posts/:postName",function(req,res){

  const requestedTitle = _.lowerCase(req.params.postName);
  Post.findOne({ title: requestedTitle }, function (err, foundPost) {
    if (err) {
      console.log(err);
    } else {
      res.render("post", {
      title: foundPost.title,
        content: foundPost.content,
       changeRoute: "logout"
    });
    }
  });
});


app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/login");
});

app.listen(port, function() {
  console.log("Server started on port 3000");
});


