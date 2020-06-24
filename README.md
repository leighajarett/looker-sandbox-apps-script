# looker-sandbox-apps-script
Google apps scripts tied to Google forms to automate access to Looker Sandbox enviornments

1. [set_up](/setup.gs) is for setting up the triggers for calling the defined functions based on a trigger from when a form is filled out by a Googler
2. [trial_users](/trial_users.gs) is the function for adding internal / prospective customers to the Looker sandbox instance and sending them an email for account verification
2. [email_hashing](/email_hashing.gs) is for hashing the result of the form to prevent PII from going into the BQ
3. [dataset_requests](/dataset_requests.gs) is for calling the cloud function defined [here](https://github.com/leighajarett/demo-dataset-access), to create a new scratch schema in BQ and a service account with a shared Cloud Secret containing the JSON keys for establishing the BQ connection in Looker 
4. [disable_users](/disable_users.gs) is for disbaling users after two weeks, and notifying the SE (while also sending along prefilled form for extending users or providing feedback)


