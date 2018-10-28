## Company:

### Company authentication

/POST /company/auth/signup

	req.body: {
		"email": "", // required
		"password": "", // required
		"name": "" // required
	}

/POST /company/auth/signin

	req.body: {
		"email": "", // required
		"password": ""  // required
	}

### Company getters and setters

/POST /company/private/{name, phone, description}  
token: required

	req.body: {
		"{name, phone, description}": ""
	}
	
Example:  
/company/private/name  

	req.body: {
		"name": "zara"
	}

/GET /company/private/{name, phone, description}  
token: required

/GET /company/private/profile  
token: required

	res.body: {
		"id": ""
		"email": ""
		"name": ""
		"phone": ""
		"description": ""
	}

/POST /company/private/profile

token: required

>Если хочешь получить какой-то параметер, то добавляешь его как ключ и 1 как значение:  
Например, "phone": "1"

	req.body: {
		"id": "1"
		"email": "1"
		"description": "1"
	}

	res.body: {
		"id": ""
		"email": ""
		"description": ""
	}

/POST /company/private/image_avatar

token: required

>Add avatar as a form-data, it should be png


### Company vacancy related requests

/POST /company/vacancy/  
token: required

	req.body: {
		"vacancyField": "", // required
		"vacancyName": "", // required
		"description": "",
		"demands": [],
		"type": [], // example: ["part-time", "internship"]
		"minSalary": "",
		"maxSalary": "",
	}

/POST /company/vacancy/apply/  
>Call student for this job.  

token: required  

	req.body: {
		"vacancyId": "", // required
		"studentId": "", // required
	}
	
/POST /company/vacancy/accept/  
>Accept student's application for this job.  

token: required

	req.body: {
		"vacancyId": "", // required
		"studentId": "", // required
	}

/POST /company/vacancy/reject/  
>Reject student's application for this job.  
Rejected application could be changed to accepted.  

token: required  

	req.body: {
		"vacancyId": "", // required
		"studentId": "", // required
	}
	
/POST /company/vacancy/discard/  
>Discard rejected application. Discarded application couldn't be changed.  

token: required

	req.body: {
		"vacancyId": "", // required
		"studentId": "", // required
	}

/GET /company/image_avatar/[image_name]

>Company's avatar is named as its id, example: "5bcasd..ddq.png"



## Students:
**__If nothing is written, then it is similar to company's equivalent request__**

### Student authentication

/POST /student/auth/signup  

	req.body: {
		"email": "", // required
		"password": "", // required
		"name": "" // required
	}

/POST /student/auth/signin  

### Student getters and setters

/POST /student/private/{firstName, lastName, phone, description}  

/GET /student/private/{firstName, lastName, phone, description}  

/GET /student/private/profile  

/POST /student/private/profile  

/POST /student/private/image_avatar

### Student vacancy related requests

/POST /student/vacancy/apply/  
>Apply for this job.  

token: required  

	req.body: {
		"vacancyId": "", // required
	}
	
/POST /student/vacancy/accept/  
>Accept company's call for this job.  

token: required  

	req.body: {
		"vacancyId": "", // required
	}

/POST /student/vacancy/reject/  
>Reject company's call for this job.  
Rejected application could be changed to accepted.  

token: required  

	req.body: {
		"vacancyId": "", // required
	}
	
/POST /student/vacancy/discard/  
>Discard rejected application. Discarded application couldn't be changed.  

token: required

	req.body: {
		"vacancyId": "", // required
	}
	
/GET /student/image_avatar/[image_name]
	
## Pagination
### Vacancies

/POST /vacancy/:id  
token: not required (yet, **TODO: fix this**)  

	req.body: {
		"requirements": { // if no requirements are set, then all info will be sent.
			"vacancyField": 1,
			"vacancyName": 1,
			"description": 1,
			"demands": 1,
			"type": 1,
			"companyId": 1,
			"companyApplied": 1,
			"studentApplied": 1,
			"minSalary": 1,
			"maxSalary": 1,
		}
	}
	
Example:  

	/vacancy/${some_id}

	req.body: {
		"vacancyField": 1,
		"companyId": 1
	}
	
	res.body: {
		"_id": "", // vacancy id will be sent anyway
		"vacancyField": "",
		"companyId": ""
	}
	
/POST /vacancy/ids/:page/:limit  
>Get ids of vacancies on the page 

token: not required(**TODO: fix**)  
:page = page number  
:limit = number of vacancies per page  
>req.body is same as in /vacancy/:id  

/POST /vacancy/:page/:limit  
>Get vacancies on the page  

token: not required(**TODO: fix**)  
:page = page number  
:limit = number of vacancies per page  

	req.body: {
		"requirements": {}, // same as before,
		"filter": { // not required
			"minSalary": "",
			"maxSalary": "",
			"vacancyField": "",
			"type": [],
		},
	}

Example:  

/vacancy/1/10  

	req.body: {
		"filter": {
			"vacancyField": "IT",
			"type": ["internship", "part-time"]
		}
	}
	
This will return 10(or less) vacancies on page #2 for all IT vacancies of type internship OR part-time.

### Students

/POST /student/:id  
token: not required (yet, **TODO: fix this**)  

	req.body: {
		"requirements": { // if no requirements are set, then all info will be sent.
			"credentials.email": 1,
			"firstName": 1,
			"lastName": 1,
			"phone": 1,
			"description": 1,
			"vacancies": 1,
		}
	}
	
Example:  

	/student/${some_id}

	req.body: {
		"credentials.email": 1,
	}
	
	res.body: {
		"_id": "", // student id will be sent anyway
		"credentials.email": "",
	}
	
/POST /student/ids/:page/:limit  
>Get ids of student on the page 

token: not required(**TODO: fix**)  
:page = page number  
:limit = number of vacancies per page  
>req.body is same as in /student/:id  

/POST /student/:page/:limit  
>Get student profiles on the page  

token: not required(**TODO: fix**)  
:page = page number  
:limit = number of students per page  
>req.body is same as in /student/:id
