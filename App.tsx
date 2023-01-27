import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useWebSocket from 'react-use-websocket';

export default function App() {
  const gridRef = useRef(); // Optional - for accessing Grid's API
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([
    { field: 'amount', sortable: true, filter: true },
    { field: 'price', sortable: true, filter: true },
    { field: 'timestamp', sortable: true, filter: true },
  ]);
  // used to control value to use for bulk edits
  const [valueToAdd, setValueToAdd] = useState(0);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
    }),
    []
  );

  const cellClickedListener = useCallback((event) => {
    console.log('cellClicked', event);
  }, []);

  const buttonListener = useCallback((e) => {
    gridRef.current.api.deselectAll();
  }, []);

  const buttonAddTransactionNotWorking = useCallback(
    (e) => {
      // This function will fail to perform an update, even though it is essentially the same to our working version fo this function.
      const gridApi = gridRef.current.api;
      const selected = gridApi.getSelectedRows();
      if (!selected || selected.length <= 0) {
        alert('Add to all selected(Broken): No rows selected');
        return;
      }
      /**
       * This is performing a map call on our selected row nodes, this will not work because we are creating a copy of our original row data.
       * This is breaking our relationship with our grid and ag-grid no longer knows where to apply our changes. In the working version below
       * we use the same object provided to us by the ag-grid API and forego creating copies.
       *  */
      const selectedToUpdate = selected.map((row) => {
        return {
          ...row,
          amount_str: (row.amount + parseFloat(valueToAdd))
            .toFixed(6)
            .toString(),
          amount: row.amount + parseFloat(valueToAdd),
        };
      });
      gridApi.applyTransaction({ update: selectedToUpdate });
    },
    [valueToAdd]
  );

  const buttonAddTransaction = useCallback(
    (e) => {
      const gridApi = gridRef.current.api;
      const selectedToUpdate = [];
      const selected = gridApi.getSelectedRows();
      if (!selected || selected.length <= 0) {
        alert('Add to all selected: No rows selected');
        return;
      }
      selected.forEach((rowData, idx) => {
        const data = rowData;
        data.amount_str = (data.amount + parseFloat(valueToAdd))
          .toFixed(6)
          .toString();
        data.amount = data.amount + parseFloat(valueToAdd);
        selectedToUpdate.push(data);
      });

      gridApi.applyTransaction({
        update: selectedToUpdate,
      });
    },
    // we will need to pass context of our state object to our callback function in order to have access to it in our useCallback hook
    [valueToAdd]
  );

  const buttonRemoveSelected = useCallback(() => {
    const gridApi = gridRef.current.api;
    const selected = gridApi.getSelectedRows();
    if (!selected || selected.length <= 0) {
      alert('Delete: No rows selected');
      return;
    }
    gridApi.applyTransaction({ remove: selected });
  }, []);

  const subscribeMsg = {
    event: 'bts:subscribe',
    data: {
      channel: 'live_trades_btcusd',
    },
  };

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    'wss://ws.bitstamp.net',
    {
      onOpen: () => sendJsonMessage(subscribeMsg),
      onMessage: (message) => {
        if (message != null) {
          const _message = JSON.parse(message.data);
          if (_message.event === 'trade' && _message.data != null) {
            _message.data.timestamp = new Date(
              _message.data.timestamp * 1000
            ).toLocaleString();
            const gridApi = gridRef.current.api;
            gridApi.applyTransaction({
              add: [_message.data],
            });
          }
        }
      },
    }
  );

  return (
    <div className="ag-theme-alpine" style={{ height: 500 }}>
      <button onClick={buttonListener}>Clear Selections</button>
      <input
        // className={styles.textbox}
        className="textbox"
        aria-label="Value to update selected"
        value={valueToAdd}
        onChange={(e) => setValueToAdd(e.target.value)}
      />
      <button onClick={buttonAddTransaction}>Add to selected</button>
      <button onClick={buttonAddTransactionNotWorking}>
        Add to selected(why doesn't this work)
      </button>
      <button onClick={buttonRemoveSelected}>Remove Selected</button>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="multiple"
        animateRows={true}
        onCellClicked={cellClickedListener}
        ref={gridRef}
      />
    </div>
  );
}
