
// Replace with the URL to your deployed Cloud Function
var url = "https://us-central1-sandbox-trials.cloudfunctions.net/demo-dataset-access"

// This function will be called when the form is submitted
function dataset_request(event) {

  // The event is a FormResponse object:
  var formResponse = event.response;

  // Gets all ItemResponses contained in the form response
  var itemResponses = formResponse.getItemResponses();
  var email = formResponse.getRespondentEmail();

  var type=null, weeks = null, opportunity_id = null, partner_name = null, internal_url = null

  for (var j = 0; j < itemResponses.length; j++) {
    var itemResponse = itemResponses[j];
    if(itemResponse.getItem().getTitle().indexOf('Opportunity ID') > -1){
      opportunity_id = itemResponse.getResponse()
    }
    if(itemResponse.getItem().getTitle().indexOf('weeks') > -1){
      weeks = itemResponse.getResponse()
    }
    if(itemResponse.getItem().getTitle().indexOf('type of Looker instance') > -1){
      type = itemResponse.getResponse()
    }
    if(itemResponse.getItem().getTitle().indexOf('name of the partner') > -1){
      partner_name = itemResponse.getResponse()
    }
    if(itemResponse.getItem().getTitle().indexOf('url for this instance') > -1){
      internal_url = itemResponse.getResponse()
    }
  }

  Logger.log(email, type, weeks, opportunity_id, partner_name, internal_url)
  get_results(email,type, weeks, opportunity_id, partner_name, internal_url)
}

function get_results(email, type, weeks = null, opportunity_id = null, partner_name = null, internal_url = null){
  var name = opportunity_id;
  
  if (name == null){name = partner_name};
  if (name == null){name = internal_url}; 

  var token = ScriptApp.getIdentityToken();

  if(type.indexOf('Personal') > -1){
    var response = UrlFetchApp.fetch(
      url,
      {
        "method": "post",
        "contentType" : "application/json",
        "headers": {
          "Authorization": "bearer " + token
        }, 
        "payload": JSON.stringify({
          "email": email,
          "type" : type
        }),
        muteHttpExceptions:true
      },
    )
  }
  else if(type.indexOf('Customer') > -1){
    var response = UrlFetchApp.fetch(
      url,
      {
        "method": "post",
        "contentType" : "application/json",
        "headers": {
          "Authorization": "bearer " + token
        }, 
        "payload": JSON.stringify({
          "email": email,
          "name": name,
          "weeks": weeks,
          "type" : type
        }),
        muteHttpExceptions:true
      },
    )
  }
  else {
    var response = UrlFetchApp.fetch(
      url,
      {
        "method": "post",
        "contentType" : "application/json",
        "headers": {
          "Authorization": "bearer " + token
        }, 
        "payload": JSON.stringify({
          "email": email,
          "name": name,
          "type" : type
        }),
        muteHttpExceptions:true
      },
    )
  };

  // grab the values from the response of the cloud function
  var data = JSON.parse(response)
  var scratch_schema = data['dataset_id'].split('.')[1]
  var service_email = data['service_email']
  var expiration = data['expiration']
  var secret_link = data['secret_link']

  Logger.log(scratch_schema, service_email, expiration, secret_link)

  var htmlBody = '<h3 style="padding-bottom:0px;font-weight:500;font-size:12">Hi Good Looker, your demo BQ service account is all ready for use!</h3>' +  
  '<h2><a href ="https://docs.google.com/document/d/1IEqzCWxP33tHrxvGyrnMYdOThS279Rl654OEQq_XyM0/edit?"> Instructions to setup the connection to BigQuery </a></h2>' +
  '<ul><li>Your service account email: ' + service_email + ' </li>' +
  '<li>Your temp dataset: ' + scratch_schema + '</li>' +
  '<li>Your credentials expire on: ' + expiration + '</li>' +
  '<li>You can view the JSON credentials for your service account here: ' + secret_link + '</li></ul>' +
  '<h3 style="padding-bottom:0px;font-weight:500;font-size:8;margin-top:25">Reply to this email if you have any issues, or find me on slack / gchat </h3>' + '<h3 style="padding-bottom:0px;font-weight:500;font-size:8;margin-top:25">~Leigha</h3>';
  var message = "";

  GmailApp.sendEmail(email, 'Demo BQ Connection', message, {'htmlBody': htmlBody},);

}
