const rules = {
	user: {
		static: [],
	},

	supervisor: {
		static: [
			"dashboard:view",
			"tickets-manager:showall",
			"ticket-options:deleteTicket",
			"contacts-page:deleteContact",
		],
	},

	admin: {
		static: [
			"dashboard:view",
			"drawer-admin-items:view",
			"tickets-manager:showall",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"contacts-page:deleteContact",
			"connections-page:actionButtons",
			"connections-page:addConnection",
			"connections-page:editOrDeleteConnection",
            "contact-page:exports"
		],
	},
};

export default rules;