function trial_users(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("trial_users");
  var selection=sheet.getDataRange();
  var rows=selection.getNumRows();

  // columns - so its easier to update
  var looker_user_column =3;
  var se_email_column = 6;
  var ae_email_column = 9;
  var is_developer_column = 4;
  var verticals_column = 5;
  var email_column = 2;
  var is_done_column = 10;
  var new_user_column = 7;

  var client_id = PropertiesService.getUserProperties().getProperty("client_id");
  var client_secret = PropertiesService.getUserProperties().getProperty("client_secret");
  var base_url = 'https://trial.looker.com:19999/api/3.1';
  //var group_id = -1;
  // var access_token = '';

  for (var row=2; row <= rows; row++) { 
    //if user has not been added yet
    if(selection.getCell(row,is_done_column).isBlank()){
      var access_token =  login(base_url,client_id,client_secret);
      var se_email = selection.getCell(row,se_email_column).getValue();
      var ae_email = selection.getCell(row,ae_email_column).getValue();
      if(selection.getCell(row,looker_user_column).getValue().indexOf('Prospect') >= 0){
        var emails = selection.getCell(row,email_column).getValue().split(',');
      }
      else{
        var emails = [se_email];
      }
      //iterate for each user
      for (var i=0; i< emails.length; i++){
        var email = emails[i].trim();
        Logger.log(email);
        // check to see if they exist already
        var existing_user = checkExistingUser(base_url, email, access_token);
        Logger.log(existing_user);
        if(existing_user.length >0){
          var user_id = parseInt(existing_user[0].id)
          //if youre trying to extend a user then renable them
          if(selection.getCell(row,new_user_column).getValue() == "Extend"){
            var user_id = enableUser(base_url,user_id, access_token)
          }
        }
        else{
          var user_id = createNewUser(base_url,access_token);
          addEmail(base_url, email, user_id, access_token);
        }
        // add to groups
        if(selection.getCell(row,looker_user_column).getValue().indexOf('Prospect') == -1){
          //add to looker group if internal user
          addGroup(base_url, user_id, 21, access_token);
        }
        //developers
        if(selection.getCell(row,is_developer_column).getValue().indexOf('Developer') > -1){
          if(selection.getCell(row,verticals_column).getValue().indexOf('Healthcare') >= 0){
            addGroup(base_url, user_id, 13, access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Financial') >= 0){
            addGroup(base_url, user_id, 19,access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Retail') >= 0){
            addGroup(base_url, user_id, 15,access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Technology') >= 0){
            addGroup(base_url, user_id, 17,access_token);
          }
        }
        //explorers
        else{
          if(selection.getCell(row,verticals_column).getValue().indexOf('Healthcare') >= 0){
            addGroup(base_url, user_id, 14,access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Financial') >= 0){
            addGroup(base_url, user_id, 20,access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Retail') >= 0){
            addGroup(base_url, user_id, 16,access_token);
          }
          if(selection.getCell(row,verticals_column).getValue().indexOf('Technology') >= 0){
            addGroup(base_url, user_id, 18,access_token);
          }
        }
        send_email(base_url, user_id, access_token, email, se_email, ae_email);
        var done_value = selection.getCell(row,is_done_column);
        var new_done_value = '';
        if (done_value.isBlank()){
          new_done_value += user_id;
        }
        else{
          new_done_value = selection.getCell(row,is_done_column).getValue() + ',' + user_id;
        }
        selection.getCell(row,is_done_column).setValue(new_done_value);
        }
    } 
  }
}

/// API Functions ///

//login to Looker
function login(base_url, client_id, client_secret) {
    Logger.log('login')
    var post = {
      'method': 'post'
    };
    var response = UrlFetchApp.fetch(base_url + "/login?client_id=" + client_id + "&client_secret=" + client_secret, post);
    return JSON.parse(response.getContentText()).access_token;
}

// checks if a user with the same email_address already exists
function checkExistingUser(base_url, email_address, token) {
    var options = {'method': 'get','headers': {'Authorization': 'token ' + token}};
    var existing_user = UrlFetchApp.fetch(base_url + "/users/search?email=" + encodeURIComponent(email_address), options);
    existing_user = JSON.parse(existing_user.getContentText());
    // Logger.log('existing user', existing_user);
    return existing_user;
}

// creates new empty Looker user
function createNewUser(base_url, token) {
  Logger.log('create user');
    var options = {'method': 'post','headers': {'Authorization': 'token ' + token},'payload': JSON.stringify({})};
    var new_user = UrlFetchApp.fetch(base_url + "/users", options);
    var user_id = parseInt(JSON.parse(new_user.getContentText()).id);
    return user_id;
}

// adds an email address to an existing user
function addEmail(base_url, email, user_id,token) {
  Logger.log('add email');
    var options = {'method': 'post','headers': {'Authorization': 'token ' + token},'payload': JSON.stringify({'email': email})};
    var response = UrlFetchApp.fetch(base_url + "/users/" + user_id +"/credentials_email", options);
}

// enables user
function enableUser(base_url,user_id, token) {
  Logger.log('enabling user')
  var options = {'muteHttpExceptions':true, 'method': 'patch','headers': {'Authorization': 'token ' + token},'payload': JSON.stringify({'is_disabled': false})};
  var response = UrlFetchApp.fetch(base_url + "/users/" + user_id, options);
  Logger.log(response)
  var user_id = parseInt(JSON.parse(response.getContentText()).id);
  return user_id;
}

// adds user to group
function addGroup(base_url, user_id, group_id, token) {
  Logger.log('add group');
  var options = {'method': 'post','headers': {'Authorization': 'token ' + token}, 'payload': JSON.stringify({'user_id': user_id})};
  // Logger.log(base_url + "/groups/" + group_id + "/users")
  var response = UrlFetchApp.fetch(base_url + "/groups/" + group_id + "/users", options);
}

// get a password reset URL, the token can be reused for setup
function send_email(base_url, user_id,token,email,se_email,ae_email) {
  Logger.log(email, user_id)
  var options = {'method': 'post','headers': {'Authorization': 'token ' + token}};
  var response = UrlFetchApp.fetch(base_url + "/users/" + user_id +"/credentials_email/password_reset?expires=" + encodeURIComponent(false), options);
  var reset_url = JSON.parse(response.getContentText()).password_reset_url;
  var reset_token = reset_url.split('/').pop(); // get the reset token only
  var url = 'https://trial.looker.com/account/setup/' + reset_token;
  var htmlBody = '<h1 style="padding-bottom:0px;color:#76678b;font-weight:500;font-size:12">Hi Good Looker, welcome to Trial.looker.com!</h1>' + 
  '<paragraph> Welcome to trial.looker.com.' +
  "We've created this instance so you can better understand how Looker will help you use data to drive real business value." +
  " Here, you will be able to walk through a series of guided data experiences that we've developed based on common use cases we see from our customers.</paragraph>"+ 
  '<h2 style="padding-bottom:0px;color:#76678b;font-weight:500;font-size:8"> If you are new to Looker we recommend checking out: </h2>' +
  '<ul><li><a href = "https://training.looker.com/" style="text-decoration:underline;color:blue">Looker Self Guided Training</a></li>' +
  '<li><a href = "https://looker.com/guide" style="text-decoration:underline;color:blue">Looker Users Guide</a></li></ul>' + 
  Utilities.formatString('<a href="%s"><button style="padding:10px;color:#ffffff;background-color:#76678b;font-weight:500;font-size:25px;margin-top:25px">Verify Your Account Here</button></a>',url) +
  '<h2 style="padding-bottom:0px;color:#76678b;font-weight:500;font-size:8;margin-top:25">~The Looker Team</h2>';
  var message = "Welcome to trial.looker.com!\n\n We've created this instance so you can better understand how Looker will help you use data to drive real business value." +
  "Here, you will be able to walk through a series of guided data experiences that we've developed based on common use cases we see from our customers \n\nTo setup your account, please go to this link: "+ url + "\n\nThanks! \n\n~The Looker Team";
  try {
    GmailApp.sendEmail(email, 'Welcome to trial.looker.com!', message, {
      'htmlBody': htmlBody,
      'cc': se_email + ',' + ae_email,
      'noReply':true
    });
  }
  catch(e) {
    Logger.log(se_email,ae_email,email)
    GmailApp.sendEmail(se_email, 'Invalid email for trial.looker.com', Utilities.formatString('The prospect or AE email you entered is invalid, for prospect - %s, please fill out the form again with the correct email address', email), {
      'cc': ae_email,
      'noReply':true
    });
 }
}
