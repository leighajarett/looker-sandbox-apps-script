function disable_users() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("trial_users");
  var selection=sheet.getDataRange();
  var rows=selection.getNumRows();
  var user_id_column = 10;
  var timestamp_column = 1;
  var se_email_column = 6;
  var ae_email_column = 9;
  var disabled_column = 11;
  var opp_id_column = 8;
  var user_type_column = 3;
  var user_email_column = 2;

  var users = {};


  // go through each email and find the last day that the user was created (its in order of when it was filled out so will always be the last row)

  for (var row=2; row <= rows; row++) { 
    if(selection.getCell(row,user_type_column).getValue().toString().indexOf('Prospect')>-1){
      var user_ids_value = (selection.getCell(row,user_id_column).getValue());
      var user_ids = user_ids_value.toString().split(',');
      for (var i=0; i<user_ids.length; i++){
        var user_id = user_ids[i];
        users[user_id] = {};
        users[user_id]['date'] = selection.getCell(row,timestamp_column).getValue();
        users[user_id]['se_email'] = selection.getCell(row,se_email_column).getValue();
        users[user_id]['ae_email'] = selection.getCell(row,ae_email_column).getValue();
        users[user_id]['opp_id'] = selection.getCell(row,opp_id_column).getValue();
        users[user_id]['not_disabled'] = selection.getCell(row,disabled_column).isBlank();
        users[user_id]['email'] = selection.getCell(row,user_email_column).getValue().toString().split(',')[i];
        users[user_id]['row'] = row;
      }
    }
  }

  // go through and figure out if the day is two weeks ago / not disabled
  var opps_to_disable =[];
  var opps_to_warn =[];

  for (var user_id of Object.keys(users)){
    var signup_day = new Date(users[user_id]['date'].setHours(0,0,0))
    var signup_ms = signup_day.getTime();

    var now_ms = new Date(new Date().setHours(0,0,0)).getTime();

    var ms_12_days  = 1000 * 60 * 60 * 24 * 12;
    var ms_14_days  = 1000 * 60 * 60 * 24 * 14;

    var days_ago_12 =  now_ms - ms_12_days;
    var days_ago_14 =  now_ms - ms_14_days;

    var deletion_day = new Date(new Date(signup_ms + ms_14_days).setHours(0,0,0,0));

    // Logger.log('user', user_id)
    // Logger.log('signup date', signup_day);
    // Logger.log('deletion date', deletion_day);
    // Logger.log('todays date', new Date(new Date().setHours(0,0,0,0)))
    // Logger.log((signup_ms < days_ago_14).toString(), users[user_id]['not_disabled'])
    // Logger.log((signup_ms < days_ago_12).toString(), users[user_id]['not_disabled'])

    if ( signup_ms < days_ago_14 && users[user_id]['not_disabled']){
      //if the signup was more than 14 days

      //disbale the user
      users[user_id]['not_disabled'] = false
      disable(user_id)
      selection.getCell(users[user_id]['row'],disabled_column).setValue('yes');

      //compress the information so we dont send a million emails to SEs
      var added = false;

      //check to see if the opp and the date it will expire already exists in our list
      for (var op=0; op < opps_to_disable.length; op++){
        var op_object = opps_to_disable[op];
        if (op_object['opp_id'] == users[user_id]['opp_id'] && op_object['date'].getTime() == deletion_day.getTime()){
          op_object['emails'].push(users[user_id]['email'])
          added = true;
        }
      }
      //check to see if the user was already added to an existing object or else create a new one and add to the list
      if(!added){
        opps_to_disable.push({
          'opp_id': users[user_id]['opp_id'],
          'se_email':users[user_id]['se_email'],
          'date': deletion_day,
          'emails': [users[user_id]['email']]
        })
      }
    }

    if ( signup_ms < days_ago_12 && users[user_id]['not_disabled'] ){

      //if the signup was more than 12 days ago and the user isnt disabled yet

      var added = false;
      for (var op=0; op < opps_to_warn.length; op++){
        var op_object_2 = opps_to_warn[op];
        if (op_object_2['opp_id'] == users[user_id]['opp_id'] && op_object_2['date'].getTime() == deletion_day.getTime()){
          op_object_2['emails'].push(users[user_id]['email'])
        }
        added=true;
      }

      if(!added){
        opps_to_warn.push({
          'opp_id': users[user_id]['opp_id'],
          'date': deletion_day,
          'emails': [users[user_id]['email']],
          'se_email':users[user_id]['se_email'], 
          'ae_email':users[user_id]['ae_email'],
        })
      }
    }
  }

  //send the feedback form to the SE
  for (var op=0; op < opps_to_disable.length; op++){
    var op_object = opps_to_disable[op];
    feedback_email(op_object['se_email'], op_object['opp_id']);
  }

  //send warning email to the SE
  for (var op=0; op < opps_to_warn.length; op++){
    var op_object_2 = opps_to_warn[op];
    disable_email(op_object_2['se_email'], op_object_2['ae_email'], op_object_2['opp_id'], op_object_2['date'], op_object_2['emails']);
  }
}

/// API Functions ///
var base_url = 'https://trial.looker.com:19999/api/3.1';

//login to Looker
function login() {
    var client_id = PropertiesService.getUserProperties().getProperty("client_id");
    var client_secret = PropertiesService.getUserProperties().getProperty("client_secret");
    var post = {
      'method': 'post'
    };
    var response = UrlFetchApp.fetch(base_url + "/login?client_id=" + client_id + "&client_secret=" + client_secret, post);
    return JSON.parse(response.getContentText()).access_token;
}

function disable(user_id) {
  Logger.log('disabling user ', user_id)
  var token = login()
  var options = {'muteHttpExceptions':true, 'method': 'patch','headers': {'Authorization': 'token ' + token},'payload': JSON.stringify( {'is_disabled': true})};
  var response = UrlFetchApp.fetch(base_url + "/users/" + user_id, options);
}


/// Email Functions

function disable_email(se_email, ae_email, opp_id, date, emails) {
  Logger.log('warning email', se_email, ae_email, opp_id, Utilities.formatDate(date, 'America/New_York', 'MMMM dd'), emails)
  var user_string = '\n\n'+emails[0];
  var user_submission = emails[0];
  var user_html = '<li>' + emails[0]
  for(i=1;i<emails.length;i++){
    user_html += '</li><li>' + emails[i];
    user_string += '\n' + emails[i];
    user_submission += ',+' + emails[i]
  }

  var form_link = "https://docs.google.com/forms/d/e/1FAIpQLScIUXOI07pDKLCAd0jcGAtfi5lZb7DczzluM6V8r_NOkCD9fw/viewform?usp=pp_url&entry.259216638=Prospect&entry.1355391157="+opp_id+"&entry.286905641="+ae_email+"&entry.897929727=" + user_submission + "&entry.1788431897=Extend";

  var message = "Hi there! \n\nThis is an email reminding you that the following users for Opporunity "+ opp_id + " are going to be disabled " + Utilities.formatDate(date, 'America/New_York', 'MMMM dd') + user_string + "\n\nIf you need to extend the users for an additional two weeks, you can do so using this form "+form_link + "\n\nThanks! \n\n~Leigha";

  var html_message = "<p> Hi there! </p> <p>This is an email reminding you that the following users for Opporunity "+ opp_id + " are going to be disabled " + Utilities.formatDate(date, 'America/New_York', 'MMMM dd') + "<ul>" + user_html + "</li></ul><p>If you need to extend the users for an additional two weeks, you can do so using"+
  "<a href='" + form_link + "'> this form </a></p> <p> Thanks! </p><p>Leigha</p>"
  
  GmailApp.sendEmail(se_email, "Trial.looker Users Expiring " + 
    Utilities.formatDate(date, 'America/New_York', 'MMMM dd'), message, {
    'cc': ae_email,
    'htmlBody': html_message
  });
}

function feedback_email(se_email, opp_id) {
  Logger.log('disable email', se_email, opp_id)
  var form_link = "https://docs.google.com/forms/d/e/1FAIpQLSd86xSEbkLX6y9iovtxrYdZ5HTBKXu2CCtZ3hKr1HP5zk7pgg/viewform?usp=pp_url&entry.1492188789=" + opp_id;
  var message = "Hi there! \n\nThanks for using trial.looker.com! Your users for Opportunity " + opp_id + " have expired, please help us make this experience even better by filling out this quick feedback form " + form_link +
  "\n\nThanks! \n\n~Leigha";

  GmailApp.sendEmail(se_email, 'Help Us Collect Feedback on Trial.looker.com', message, {});
}
