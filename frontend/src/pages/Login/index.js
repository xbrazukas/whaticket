import React, { useState, useContext, useEffect } from "react";//import { Link as RouterLink } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid"; 
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

import { AuthContext } from "../../context/Auth/AuthContext";

const Copyright = () => {
	return (
		<Typography variant="body2" color="powered" align="center">
			{"Copyright "}

			{new Date().getFullYear()}{" - "}

 			{`${process.env.REACT_APP_NAME_SYSTEM}`}
 		</Typography>
 	);
 };

const useStyles = makeStyles(theme => ({
	root: {
		width: "100vw",
		height: "100vh",
		// background: `${process.env.REACT_APP_BACKDROP_LOADING}`,
		// backgroundImage: "url(https://th.bing.com/th/id/OIP.YRbnvsV4zu-8RejDYPrlKwHaDt?pid=ImgDet&rs=1)",
		// backgroundRepeat: "no-repeat",
		// backgroundSize: "100% 100%",
		// backgroundPosition: "center",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
	},
	paper: {
		backgroundColor: "white",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "55px 30px",
		borderRadius: "12.5px",
	},
	avatar: {
		margin: theme.spacing(1),  
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%", // Fix IE 11 issue.
		marginTop: theme.spacing(1),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
	powered: {
		color: `${process.env.REACT_APP_POWERED_COLOR_LOGIN}`,
	}
}));

const Login = () => {
	const classes = useStyles();

	const [user, setUser] = useState({ email: "", password: "" });

	const { handleLogin } = useContext(AuthContext);

    const [backdropColor, setbackdropColor] = useState('');
    const [viewregister, setviewregister] = useState('disabled');

  	useEffect(() => {
    	fetchBackdropBackground();
  	}, []);

    useEffect(() => {
    	fetchviewregister();
  	}, []);

  	const fetchBackdropBackground = async () => {
  
 
    try {
    	const response = await api.get("/settings/backgroundPages");
      	const backdropBackground = response?.data?.value;
      	
      	setbackdropColor(backdropBackground);
    	} catch (error) {
    		console.error('Error retrieving toolbar background color', error);
    	}
  	};

  	const backdropStyle = {
    	background: backdropColor,
  	};


	const fetchviewregister = async () => {
  
 
    try {
    	const responsev = await api.get("/settings/viewregister");
      	const viewregisterX = responsev?.data?.value;
      	// console.log(viewregisterX);
      	setviewregister(viewregisterX);
    	} catch (error) {
    		console.error('Error retrieving viewregister', error);
    	}
  	};


	const handleChangeInput = e => {
		setUser({ ...user, [e.target.name]: e.target.value });
	};

	const handlSubmit = e => {
		e.preventDefault();
		handleLogin(user);
	};

    const logo = `${process.env.REACT_APP_BACKEND_URL}/public/logotipos/login.png`;
	const linksuporte = `${process.env.REACT_APP_LINK_SUPORTE}`;
    const randomValue = Math.random(); // Generate a random number
  
    const logoWithRandom = `${logo}?r=${randomValue}`;

	return (
		<div className={classes.root} style={backdropStyle}>
		<Container component="main" maxWidth="xs">
			<CssBaseline/>
			<div className={classes.paper}>
				<div>
					<img style={{ margin: "0 auto", width: "80%" }} src={logoWithRandom} alt={`${process.env.REACT_APP_NAME_SYSTEM}`} />
				</div>
				{/*<Typography component="h1" variant="h5">
					{i18n.t("login.title")}
				</Typography>*/}
				<form className={classes.form} noValidate onSubmit={handlSubmit}>
					<TextField
						variant="standard"
						margin="normal"
						required
						fullWidth
						id="email"
						label={i18n.t("login.form.email")}
						name="email"
						value={user.email}
						onChange={handleChangeInput}
						autoComplete="email"
						autoFocus
					/>
					<TextField
						variant="standard"
						margin="normal"
						required
						fullWidth
						name="password"
						label={i18n.t("login.form.password")}
						type="password"
						id="password"
						value={user.password}
						onChange={handleChangeInput}
						autoComplete="current-password"
					/>
					<Button
						type="submit"
						fullWidth
						variant="contained"
						color="primary"
						className={classes.submit}
					>
						{i18n.t("login.buttons.submit")}
					</Button>
                    {viewregister === "enabled" && (
                    <>
					<Grid container>
						<Grid item>
							<Link
								href="#"
								variant="body2"
								component={RouterLink}
								to="/signup"
							>
								{i18n.t("login.buttons.register")}
							</Link>
						</Grid>
					</Grid>
                    </>
                    )}
                    <Grid container>
						<Grid item>
							<Link
								href="#"
								variant="body2"
								component={RouterLink}
								to="/forgotpassword"
							>
								{i18n.t("login.buttons.forgotpassword")}
							</Link>
						</Grid>
					</Grid>
				</form>
			
			</div>
			
			
			<Box mt={5} style={{ color: "white" }}>{ <Copyright /> }
			<Link style={{ color: "white" }}
				href={linksuporte}
				variant="body2"
			>
				Suporte
			</Link>
			</Box>
			
		</Container>
		</div>
	);
};

export default Login;
