require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require("lodash");

const app = express();

app.use(express.static("public"));
app.set("view engine" , "ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: 'Thisisourlittlesecret',
  resave: false,
  saveUninitialized: true,
  // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);

// mongoose.connect('mongodb://localhost:27017/blogDB', {useNewUrlParser: true, useUnifiedTopology: true});

const postSchema = [{
    title: String,
    content: String
}];

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    posts : postSchema
});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
// const Post = new mongoose.model("Post",postSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null,user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/blogs",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));
//
app.get("/auth/google/blogs",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/blogs");
});

app.get("/login",function(req,res){
    res.render("login");
});
//
app.post("/login", passport.authenticate("local"), function(req, res){
    res.redirect("/blogs");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/blogs",function(req,res){
    if(req.isAuthenticated()){
        User.find({},function(err,foundUsers){
            if(err){
                console.log(err);
            }else{
                if(foundUsers){
                    res.render("blogs",{homeContent:homeStartingContent,users:foundUsers});
                }
            }
        });
    }else{
        res.redirect("/login");
    }

});

app.get("/compose",function(req,res){
    if(req.isAuthenticated()){
        res.render("compose");
    }else{
        res.redirect("/login");
    }
});

app.post("/compose",function(req,res){
    const submittedpost = {
        title: _.capitalize(req.body.postTitle),
        content: req.body.postBody
    };

    User.findById(req.user._id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.posts.push(submittedpost);
                foundUser.save(function(){
                    res.redirect("/blogs");
                });
            }
        }
    });

});

app.get("/myBlogs",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user._id, function(err, foundUser){
            if(err){
                console.log(err);
            }else{
                if(foundUser){
                    res.render("myblogs",{posts : foundUser.posts});
                }
            }
        });
    }else{
        res.redirect("/login");
    }
});

app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/blogs");
            });
        }
    });
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
})

app.listen(3000,function(){
    console.log("Server started on port 3000.");
});
