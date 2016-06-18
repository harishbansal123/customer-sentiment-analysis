# Bluemix Object Storage application

This sample application illustrates the usage of the OpenStack Swift Object Storage service by a Node.js application deployed to IBM Bluemix using IBM Bluemix DevOps Services.

The resulting application allows you to upload, download, and delete any type of file to the Swift-backed service. A running example is available here: http://bluemix-object-storage.mybluemix.net/


## Steps

Follow these steps to set up a Bluemix account, provision an instance of the Swift Object Storage, and deploy a Node.js application that provides a browser based user interface for uploading and sharing files.

* Sign up for [IBM Bluemix](http://bluemix.net/), validate your account, and sign in.

* Create an instance of the [Object Store service](https://www.ng.bluemix.net/docs/#services/ObjectStorage/index.html#ObjectStorage) through the Bluemix catalog UI. Name the service 'object-storage' and leave it unbound.

![Provision Bluemix Object Storage](http://bluemix-object-storage.mybluemix.net/img/object-storage-tile.png)

![Provision Bluemix Object Storage](http://bluemix-object-storage.mybluemix.net/img/configuration.png)

* Link your Bluemix ID to the [IBM DevOps Service](http://hub.jazz.net/) by signing in. Set an alias for your account.

* Fork the [bluemix-object-storage](https://hub.jazz.net/git/krook/bluemix-object-storage) repository to get the application code (check the box to "Make it private (not public)", uncheck the "Add features for Scrum development", and check "Make this a Bluemix Project").

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/fork-project.png)

* Prepare a deployment pipeline for the application to Bluemix using the Build & Deploy button in the top right corner.

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/build-and-deploy.png)

* Add a Stage and name it Deploy. Review the Input and Jobs tabs in the new window, make sure that the Job type is Deploy, then click Save.

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/add-stage.png)
![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/deploy-input.png)

* Now, click the play icon in the stage to begin a deployment. If the deployment fails, ensure that you provisioned the Object Storage service earlier. You can debug other errors by clicking the "View logs and history" link.

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/successful-deployment-play.png)

* You can now access the application via the URL shown under "Last Execution Result" to upload / view / delete any text, image, and PDF files.

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/successful-deployment-url.png)

* As you make other changes and push the files to the master branch, the deployment will commence automatically. Click the Edit Code button in the top right corner, then open the app.js file. 

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/edit-code.png)
![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/git-icon.png)

* Modify the code, and choose the Git icon in the left navigation. Select the app.js file, provide a comment, click the Commit button to save it to your branch, and then click the Sync button to push it to the master branch.

![GitHub Logo](http://bluemix-object-storage.mybluemix.net/img/commit.png)

* If you click the Build & Deploy button again, you will see that your application is automatically redeploying or has already deployed.

* As a further exercise, you can also add additional stages to handle test execution, application builds, and script zero downtime deployments.

* You can also provision other other services in the Bluemix catalog and update the code to consume them using Object Storage as an example.
