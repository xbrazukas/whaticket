import React, { useState, useEffect, useContext, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import Board from 'react-trello';
import { toast } from 'react-toastify';

import { useHistory } from 'react-router-dom';

import usePlans from '../../hooks/usePlans';
import useTickets from '../../hooks/useTickets';
import { DatePickerMoment } from '../../components/DatePickerMoment';
import { UsersFilter } from '../../components/UsersFilter';
import { KanbanSearch } from '../../components/KanbanSearch/KanbanSearch';
import moment from 'moment';

/*


CÓDIGO DESENVOLVIDO POR RAFAEL RIBEIRO
PROÍBIDA A VENDA TOTAL OU PARCIAL DESTE CÓDIGO
CONTATO: HELP@WHATICKET-SAAS.COM
TELEFONE: +55 51 9323-1592


*/

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  button: {
    background: '#10a110',
    border: 'none',
    padding: '10px',
    color: 'white',
    fontWeight: 'bold',
    borderRadius: '5px',
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tags, setTags] = useState([]);
  const [reloadData, setReloadData] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [ticketList, setTicketList] = useState([]);
  const { user } = useContext(AuthContext);
  const { profile, queues } = user;
  const jsonString = user.queues.map((queue) => queue.UserQueue.queueId);
  const [t, setT] = useState(0);

  const [searchParams, setSearchParams] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState({
    from: '',
    until: '',
  });

  const { getPlanCompany } = usePlans();

  // const { tickets, hasMore, loading } = useTickets({
  //   searchParam: searchParams
  //     .toLowerCase()
  //     .trim()
  //     .normalize('NFD')
  //     .replace(/[\u0300-\u036f]]/g, ''),
  //   users: JSON.stringify(selectedUsers),
  //   queueIds: JSON.stringify(jsonString),
  // });

  useEffect(() => {
    async function fetchData() {
      const companyId = localStorage.getItem('companyId');
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useKanban) {
        toast.error(
          'Você não possui acesso a este recurso! Faça um upgrade em sua assinatura ou contate o suporte!'
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags/kanban');
      const fetchedTags = response.data.lista || [];
      setTags(fetchedTags);

      // Fetch tickets after fetching tags
      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [selectedUsers, selectedDate, searchParams]);

  const [file, setFile] = useState({
    lanes: [],
  });

  const fetchTickets = async (jsonString) => {
    try {
      setT(t + 1);
      const { data } = await api.get('/tickets/kanban', {
        params: {
          showAll: false,
          searchParam: searchParams,
          users: JSON.stringify(selectedUsers),
          queueIds: JSON.stringify(jsonString),
          dateFrom: selectedDate?.from,
          dateUntil: selectedDate?.until,
        },
      });

      setTicketList(data.tickets);
    } catch (err) {
      console.log(err);
      setTicketList([]);
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

  const handleCardClick = useCallback(
    (uuid) => {
      //console.log("Clicked on card with UUID:", uuid);
      history.push('/tickets/' + uuid);
    },
    [history]
  );

  // const popularCards = useCallback(
  //   (jsonString) => {
  //     const { button } = classes;
  //     console.log({ tickets }, 'TICKETS AQUI');
  //     const filteredTickets = tickets.filter(
  //       (ticket) => ticket.tags.length === 0
  //     );

  //     //console.log(filteredTickets);

  //     const lanes = [
  //       {
  //         id: 'lane0',
  //         title: 'Em Aberto',
  //         label: '0',
  //         cards: filteredTickets.map((ticket) => ({
  //           id: ticket.id.toString(),
  //           label: 'Ticket nº ' + ticket.id.toString(),
  //           description: (
  //             <div>
  //               <p>
  //                 {ticket.contact.number}
  //                 <br />
  //                 {ticket.lastMessage}
  //               </p>
  //               <button
  //                 className={classes.button}
  //                 onClick={() => handleCardClick(ticket.uuid)}
  //               >
  //                 Ver Ticket
  //               </button>
  //             </div>
  //           ),
  //           title: ticket.contact.name,
  //           draggable: true,
  //           href: '/tickets/' + ticket.uuid,
  //         })),
  //       },
  //       ...tags.map((tag) => {
  //         const filteredTickets = tickets.filter((ticket) => {
  //           const tagIds = ticket.tags.map((tag) => tag.id);
  //           return tagIds.includes(tag.id);
  //         });

  //         let somaTotalValorDoLead = 0;

  //         // Percorrendo todos os tickets e somando os valores do campo "Valor do Lead"
  //         for (const ticketCC of filteredTickets) {
  //           for (const extraInfo of ticketCC.contact.extraInfo) {
  //             if (extraInfo.name === 'Valor do Lead') {
  //               somaTotalValorDoLead += parseFloat(extraInfo.value);
  //               break;
  //             }
  //           }
  //         }

  //         return {
  //           id: tag.id.toString(),
  //           title:
  //             tag.name +
  //             ' ' +
  //             filteredTickets.length +
  //             ' (' +
  //             somaTotalValorDoLead +
  //             ')',
  //           label: tag.id.toString(),
  //           cards: filteredTickets.map((ticket) => ({
  //             id: ticket.id.toString(),
  //             label: 'Ticket nº ' + ticket.id.toString(),
  //             description: (
  //               <div>
  //                 <p>
  //                   {ticket.contact.number}
  //                   <br />
  //                   {ticket.lastMessage}
  //                 </p>
  //                 <button
  //                   className={button}
  //                   onClick={() => handleCardClick(ticket.uuid)}
  //                 >
  //                   Ver Ticket
  //                 </button>
  //               </div>
  //             ),
  //             title: ticket.contact.name,
  //             draggable: true,
  //             href: '/tickets/' + ticket.uuid,
  //           })),
  //           style: { backgroundColor: tag.color, color: 'white' },
  //         };
  //       }),
  //     ];

  //     setFile({ lanes });
  //   },
  //   [classes, handleCardClick, tags, tickets]
  // );

  // const filterByDateRange = useCallback(
  //   (filterItemList) => {
  //     if (!selectedDate) {
  //       return filterItemList;
  //     }

  //     const filteredList = filterItemList.filter((filterItem) => {
  //       return moment(
  //         moment(filterItem.updatedAt).format('YYYY-MM-DD')
  //       ).isBetween(selectedDate?.from, selectedDate?.until, 'days', '[]');
  //     });

  //     return filteredList.length === 0 ? filterItemList : filteredList;
  //   },
  //   [selectedDate]
  // );

  // console.log(profile);

  useEffect(() => {
    const { button } = classes;
    const filteredTickets = ticketList.filter(
      (ticket) => ticket.tags.length === 0
    );

    if (!filteredTickets) return;

    const lanes = [
      // KANBAN TICKETS EM ABERTO
      // {
      //   id: 'lane0',
      //   title: 'Em Aberto',
      //   label: '0',
      //   cards: filteredTickets.map((ticket) => ({
      //     id: ticket.id.toString(),
      //     label: 'Ticket nº ' + ticket.id.toString(),
      //     description: (
      //       <div>
      //         <p>
      //           {ticket.contact.number}
      //           <br />
      //           {ticket.lastMessage}
      //         </p>
      //         <button
      //           className={classes.button}
      //           onClick={() => handleCardClick(ticket.uuid)}
      //         >
      //           Ver Ticket
      //         </button>
      //       </div>
      //     ),
      //     title: ticket.contact.name,
      //     draggable: true,
      //     href: '/tickets/' + ticket.uuid,
      //   })),
      // },
      ...tags.map((tag) => {
        const filteredTickets = ticketList.filter((ticket) => {
          const tagIds = ticket.tags.map((tag) => tag.id);
          return tagIds.includes(tag.id);
        });

        let somaTotalValorDoLead = 0;

        // Percorrendo todos os tickets e somando os valores do campo "Valor do Lead"
        for (const ticketCC of filteredTickets) {
          if (ticketCC?.contact?.extraInfo) {
            for (const extraInfo of ticketCC?.contact?.extraInfo) {
              if (extraInfo.name === 'Valor do Lead') {
                somaTotalValorDoLead += parseFloat(extraInfo.value);
                break;
              }
            }
          }
        }

        return {
          id: tag.id.toString(),
          title:
            tag.name +
            ' ' +
            filteredTickets.length +
            ' (' +
            somaTotalValorDoLead +
            ')',
          label: tag.id.toString(),
          cards: filteredTickets.map((ticket) => ({
            id: ticket.id.toString(),
            label: 'Ticket nº ' + ticket.id.toString(),
            description: (
              <div>
                <p>
                  {ticket.contact.number}
                  <br />
                  {ticket.lastMessage}
                </p>
                <button
                  className={button}
                  onClick={() => handleCardClick(ticket.uuid)}
                >
                  Ver Ticket
                </button>
              </div>
            ),
            title: ticket.contact.name,
            draggable: true,
            href: '/tickets/' + ticket.uuid,
          })),
          style: { backgroundColor: tag.color, color: 'white' },
        };
      }),
    ];

    setFile({ lanes });
  }, [classes, handleCardClick, tags, ticketList, searchParams]);

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

  const onFiltered = (value) => {
    const users = value.map((t) => t.id);
    setSelectedUsers(users);
  };

  const onChangeSearch = (searchValue) => {
    setSearchParams(searchValue);
  };

  const handleSelectedDate = (value, range) => {
    setSelectedDate({ ...selectedDate, [range]: value });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          paddingTop: 20,
          paddingLeft: 20,
        }}
      >
        <KanbanSearch searchParams={onChangeSearch} />
        {(profile === 'admin' || profile === 'supervisor') && (
          <UsersFilter onFiltered={onFiltered} />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <DatePickerMoment
            label={'De'}
            getDate={(value) => handleSelectedDate(value, 'from')}
          />
          <DatePickerMoment
            label={'Até'}
            getDate={(value) => handleSelectedDate(value, 'until')}
          />
        </div>
      </div>
      <div className={classes.root}>
        <Board
          data={file}
          onCardMoveAcrossLanes={handleCardMove}
          style={{ backgroundColor: 'rgba(252, 252, 252, 0.03)' }}
        />
      </div>
    </div>
  );
};

export default Kanban;
