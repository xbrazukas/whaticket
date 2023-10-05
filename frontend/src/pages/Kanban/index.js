import React, { useState, useEffect, useReducer, useContext, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from 'react-trello';
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from 'react-router-dom';
import { socketConnection } from "../../services/socket";
import usePlans from "../../hooks/usePlans";

/*


CÓDIGO DESENVOLVIDO POR RAFAEL RIBEIRO
PROÍBIDA A VENDA TOTAL OU PARCIAL DESTE CÓDIGO
CONTATO: HELP@WHATICKET-SAAS.COM
TELEFONE: +55 51 9323-1592


*/


const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1),
  },
  button: {
    background: "#10a110",
    border: "none",
    padding: "10px",
    color: "white",
    fontWeight: "bold",
    borderRadius: "5px",
  },
  
}));



const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tags, setTags] = useState([]);
  const [reloadData, setReloadData] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const companyId = localStorage.getItem("companyId");
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useKanban) {
        toast.error("Você não possui acesso a este recurso! Faça um upgrade em sua assinatura ou contate o suporte!");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchTags = async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista || []; 
      //console.log(response);
      setTags(fetchedTags);

      // Fetch tickets after fetching tags
      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const [file, setFile] = useState({
    lanes: []
  });


  const [tickets, setTickets] = useState([]);
  const { user } = useContext(AuthContext);
  const { profile, queues } = user;
  const jsonString = user.queues.map(queue => queue.UserQueue.queueId);

  const fetchTickets = async (jsonString) => {
    try {
      const { data } = await api.get("/tickets/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          teste: true
        }
      });
    
      console.log(data);
    
      setTickets(data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

/*

  const reloadKanbanData = useCallback(async () => {
    await fetchTags();
    await fetchTickets(jsonString);
  }, [fetchTags, fetchTickets, jsonString]);

  useEffect(() => {
    if (isInitialLoadComplete) {
      reloadKanbanData();
    } else {
      setIsInitialLoadComplete(true);
    }
  }, [isInitialLoadComplete, reloadKanbanData]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketConnection({ companyId });

    socket.on("connect", () => socket.emit("joinNotification"));
    socket.on(`company-${companyId}-contact`, (data) => {
      if (data.action === "updateUnread") {
        console.log("Received WebSocket data:", data);
        setReloadData(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reloadData && isInitialLoadComplete) {
      reloadKanbanData();
      setReloadData(false);
    }
  }, [reloadData, isInitialLoadComplete, reloadKanbanData]);


*/

const popularCards = (jsonString) => {
  const filteredTickets = tickets.filter(ticket => ticket.tags.length === 0);

  //console.log(filteredTickets);

  const lanes = [
    {
      id: "lane0",
      title: "Em Aberto",
      label: "0",
      cards: filteredTickets.map(ticket => ({
        id: ticket.id.toString(),
        label: "Ticket nº " + ticket.id.toString(),
        description: (
            <div>
              <p>
                {ticket.contact.number}
                <br />
                {ticket.lastMessage}
              </p>
              <button className={classes.button} onClick={() => handleCardClick(ticket.uuid)}>Ver Ticket</button>
            </div>
          ),
        title: ticket.contact.name,
        draggable: true,
        href: "/tickets/" + ticket.uuid,
      })),
    },
    ...tags.map(tag => {
      const filteredTickets = tickets.filter(ticket => {
        const tagIds = ticket.tags.map(tag => tag.id);
        return tagIds.includes(tag.id);
      });
    
      let somaTotalValorDoLead = 0;

	// Percorrendo todos os tickets e somando os valores do campo "Valor do Lead"
	for (const ticketCC of filteredTickets) {
    	for (const extraInfo of ticketCC.contact.extraInfo) {
        	if (extraInfo.name === "Valor do Lead") {
            	somaTotalValorDoLead += parseFloat(extraInfo.value);
            	break;
        	}
    	}
	}

      return {
        id: tag.id.toString(),
        title: tag.name + " " + filteredTickets.length + " (" + somaTotalValorDoLead + ")",
        label: tag.id.toString() ,
        cards: filteredTickets.map(ticket => ({
          id: ticket.id.toString(),
          label: "Ticket nº " + ticket.id.toString(),
          description: (
            <div>
              <p>
                {ticket.contact.number}
                <br />
                {ticket.lastMessage}
              </p>
              <button className={classes.button} onClick={() => handleCardClick(ticket.uuid)}>Ver Ticket</button>
            </div>
          ),
          title: ticket.contact.name,
          draggable: true,
          href: "/tickets/" + ticket.uuid,
        })),
        style: { backgroundColor: tag.color, color: "white" }
      };
    }),
  ];

  setFile({ lanes });
};

const handleCardClick = (uuid) => {  
  //console.log("Clicked on card with UUID:", uuid);
  history.push('/tickets/' + uuid);
};

useEffect(() => {
  popularCards(jsonString);
}, [tags, tickets, reloadData]);




const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
  try {
      
        await api.delete(`/ticket-tags/${targetLaneId}`);
  		toast.success('Ticket Tag Removido!');
        await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);
  		toast.success('Ticket Tag Adicionado com Sucesso!');

  } catch (err) {
    console.log(err);
  }
};





  return (
    <div className={classes.root}>
      <Board 
		data={file} 
		onCardMoveAcrossLanes={handleCardMove}
		style={{backgroundColor: 'rgba(252, 252, 252, 0.03)'}}
    />
    </div>
  );
};


export default Kanban;