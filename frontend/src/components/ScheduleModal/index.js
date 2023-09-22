import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  ListItemText,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import moment from "moment"
import { AuthContext } from "../../context/Auth/AuthContext";
import { isArray, capitalize } from "lodash";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
}));

const ScheduleSchema = Yup.object().shape({
	body: Yup.string()
		.min(5, "Mensagem muito curta")
		.required("Obrigatório"),
	contactId: Yup.number().required("Obrigatório"),
	sendAt: Yup.string().required("Obrigatório")
});

const ScheduleModal = ({ open, onClose, scheduleId, contactId, cleanContact, reload }) => {
	const classes = useStyles();
	const history = useHistory();
	const { user } = useContext(AuthContext);
	

	const initialState = {
		body: "",
		contactId: "",
		sendAt: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
		sentAt: "",
        geral: "",
        queueId: "",
        whatsappId: ""
	};

	const initialContact = {
		id: "",
		name: ""
	}

	const [schedule, setSchedule] = useState(initialState);
	const [currentContact, setCurrentContact] = useState(initialContact);
	const [contacts, setContacts] = useState([initialContact]);
	const [selectedQueue, setSelectedQueue] = useState("");
	const [connections, setConnections] = useState([]);
	const [selectedConnection, setSelectedConnection] = useState("");
	const [loading, setLoading] = useState(false);


	useEffect(() => {
		if (contactId && contacts.length) {
			const contact = contacts.find(c => c.id === contactId);
			if (contact) {
				setCurrentContact(contact);
			}
		}
	}, [contactId, contacts]);

	    useEffect(() => {
    
    const fetchWhatsapps = async () => {
			try {
				const { data } = await api.get("whatsapp", {});
				
				setConnections(data);
				setLoading(false);	
				//console.log(data);
            
			} catch (err) {
				setLoading(false);
				toastError(err);
			}
		};

			fetchWhatsapps();
    
    }, []);

	useEffect(() => {
		const { companyId } = user;
		if (open) {
			try {
				(async () => {
					const { data: contactList } = await api.get('/contacts/list', { params: { companyId: companyId } });
					let customList = contactList.map((c) => ({id: c.id, name: c.name}));
					if (isArray(customList)) {
						setContacts([{id: "", name: ""}, ...customList]);
					}
					if (contactId) {
						setSchedule(prevState => {
							return { ...prevState, contactId }
						});
					}

					if (!scheduleId) return;

					const { data } = await api.get(`/schedules/${scheduleId}`);
					setSchedule(prevState => {
						return { ...prevState, ...data, sendAt: moment(data.sendAt).format('YYYY-MM-DDTHH:mm') };
					});
					setCurrentContact(data.contact);
				})()
			} catch (err) {
				toastError(err);
			}
		}
	}, [scheduleId, contactId, open, user]);

	const handleClose = () => {
		onClose();
		setSchedule(initialState);
	};

	const handleSaveSchedule = async values => {
    
    	const queueId = selectedQueue !== "" ? selectedQueue : null;
		const connId = selectedConnection !== "" ? selectedConnection : null;
    
        //console.log(queueId);
    
		if (selectedQueue === "" && (user.profile !== 'admin' || user.profile !== 'supervisor')) {
			//toast.error("Selecione uma fila!");
			//return;
		}
    
    	if (selectedConnection === ""){
			toast.error("Selecione uma conexão!");
			return;
		}
    
    	const scheduleData = { ...values, userId: user.id, whatsappId: connId, queueId };
    
    
		try {
			if (scheduleId) {
				await api.put(`/schedules/${scheduleId}`, scheduleData);
			} else {
				await api.post("/schedules", scheduleData);
			}
			toast.success(i18n.t("scheduleModal.success"));
			if (typeof reload == 'function') {
				reload();
			}
			if (contactId) {
				if (typeof cleanContact === 'function') {
					cleanContact();
					history.push('/schedules');
				}
			}
		} catch (err) {
			toastError(err);
		}
		setCurrentContact(initialContact);
		setSchedule(initialState);
		handleClose();
	};

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="xs"
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">
					{schedule.status === 'ERRO' ? 'Erro de Envio' : `Mensagem ${capitalize(schedule.status)}`}
				</DialogTitle>
				<Formik
					initialValues={schedule}
					enableReinitialize={true}
					validationSchema={ScheduleSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveSchedule(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values }) => (
						<Form>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<FormControl
										variant="outlined"
										fullWidth
									>
										<Autocomplete
											fullWidth
											value={currentContact}
											options={contacts}
											onChange={(e, contact) => {
												const contactId = contact ? contact.id : '';
												setSchedule({ ...schedule, contactId });
												setCurrentContact(contact ? contact : initialContact);
											}}
											getOptionLabel={(option) => option.name}
											getOptionSelected={(option, value) => {
												return value.id === option.id
											}}
											renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Contato" />}
										/>
									</FormControl>
								</div>
								<br />
                                
                   <div className={classes.multFieldLine}>             				  
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel id="geral-selection-label">
                        {i18n.t("scheduleModal.form.geral")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("scheduleModal.form.geral")}
                        placeholder={i18n.t("scheduleModal.form.geral")}
                        labelId="geral-selection-label"
                        id="geral"
                        name="geral"
                        error={touched.geral && Boolean(errors.geral)}
                      >
                        <MenuItem value={true}><ListItemText primary="Sim" /></MenuItem>
                        <MenuItem value={false}><ListItemText primary="Não" /></MenuItem>
                      </Field>
                    </FormControl>
                 	</div>
					<br />
                                
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										rows={9}
										multiline={true}
										label={i18n.t("scheduleModal.form.body")}
										name="body"
										error={touched.body && Boolean(errors.body)}
										helperText={touched.body && errors.body}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
								</div>
								<br />
       <div className={classes.multFieldLine}>                         
       <Select
        fullWidth
        displayEmpty
        variant="outlined"
        value={selectedConnection}
        onChange={(e) => {
          setSelectedConnection(e.target.value);
        }}
        renderValue={() => {
          if (selectedConnection === "") {
            return "Selecione uma conexão";
          }
          const connection = connections.find((conn) => conn.id === selectedConnection);
          return connection?.name || "";
        }}
      >
        {connections.map((connection) => (
          <MenuItem key={connection.id} value={connection.id}>
            <ListItemText primary={connection.name} />
          </MenuItem>
        ))}
      </Select>
       </div>
								<br />       
                                
                             <div className={classes.multFieldLine}>   
                                <Select
								fullWidth
								displayEmpty
								variant="outlined"
								value={selectedQueue}
								onChange={(e) => {
									setSelectedQueue(e.target.value)
								}}
								MenuProps={{
									anchorOrigin: {
										vertical: "bottom",
										horizontal: "left",
									},
									transformOrigin: {
										vertical: "top",
										horizontal: "left",
									},
									getContentAnchorEl: null,
								}}
								renderValue={() => {
									if (selectedQueue === "") {
										return "Selecione uma fila"
									}
									const queue = user.queues.find(q => q.id === selectedQueue)
									return queue.name
								}}
							>
								{user.queues?.length > 0 &&
									user.queues.map((queue, key) => (
										<MenuItem dense key={key} value={queue.id}>
											<ListItemText primary={queue.name} />
										</MenuItem>
									))}
							</Select>
                           </div>
                           <br />
                           
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("scheduleModal.form.sendAt")}
										type="datetime-local"
										name="sendAt"
										InputLabelProps={{
										  shrink: true,
										}}
										error={touched.sendAt && Boolean(errors.sendAt)}
										helperText={touched.sendAt && errors.sendAt}
										variant="outlined"
										fullWidth
									/>
								</div>
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("scheduleModal.buttons.cancel")}
								</Button>
								{ (schedule.sentAt === null || schedule.sentAt === "") && (
									<Button
										type="submit"
										color="primary"
										disabled={isSubmitting}
										variant="contained"
										className={classes.btnWrapper}
									>
										{scheduleId
											? `${i18n.t("scheduleModal.buttons.okEdit")}`
											: `${i18n.t("scheduleModal.buttons.okAdd")}`}
										{isSubmitting && (
											<CircularProgress
												size={24}
												className={classes.buttonProgress}
											/>
										)}
									</Button>
								)}
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default ScheduleModal;