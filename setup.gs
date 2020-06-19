
// only run once to setup project
function create_triggers () {
  var user_form = FormApp.openById('1fp1ZocWvj_wUneqIkn66HKGA_1vBQdW4IPlzjpT-AmI');
  var dataset_form = FormApp.openById('10gNZzcN_vygqbGRrkzv0Pia_NpNuEPaVfc6qZpBeSgs');

  ScriptApp.newTrigger('trial_users').forForm(user_form).onFormSubmit().create();
  ScriptApp.newTrigger('dataset_request').forForm(dataset_form).onFormSubmit().create();

  // Sets the client id and secret
  // var userProperties = PropertiesService.getUserProperties();
  // userProperties.setProperty('client_id', '');
  // userProperties.setProperty('client_secret', '');
}
