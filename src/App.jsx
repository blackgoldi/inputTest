import { Box, ButtonGroup, Button, css } from '@mui/material';
import { DataGrid, GridCellModes, useGridApiRef } from '@mui/x-data-grid'
import React from 'react';

function App() {
  const rows = useStateProperty([
    new Register('var1', 'uint8', null, false, 'Описание'),
    new Register('var2', 'uint8', null, false, 'Описание'),
    new Register('var3', 'uint8', null, false, 'Описание'),
    new Register('var4', 'uint8', null, false, 'Описание'),
    new Register('var5', 'uint8', null, false, 'Описание'),
    new Register('var6', 'uint8', null, false, 'Описание'),
    new Register('var7', 'uint8', null, false, 'Описание'),
    new Register('var8', 'uint8', null, false, 'Описание'),
    new Register('var9', 'uint8', null, false, 'Описание'),
    new Register('var10', 'uint8', null, false, 'Описание'),
  ]);

  const gridApi = useGridApiRef();
  const [draggedRowId, setDraggedRowId] = React.useState(null);
  const dragGhostRef = React.useRef(null);
  const dropTargetId = React.useRef(null);

  /**
   * @param {Register} newRow 
   * @param {Register} oldRow 
   */
  function handleProcessRowUpdate(newRow, oldRow) {
    const index = rows.get.findIndex(row => getRowId(row) === getRowId(oldRow));
    if (index !== -1) {
      const newRows = [...rows.get];
      newRows[index] = new Register(newRow.name, newRow.type, newRow.bit, newRow.writable, newRow.description);
      rows.set(newRows);
      return newRow;
    }
    return oldRow;
  }

  function handleCellClick(params, event) {
    if (event.target.nodeType === 1 && !event.currentTarget.contains(event.target)) return;

    if (params.isEditable && gridApi.current.getCellMode(params.id, params.field) === GridCellModes.View) {
      gridApi.current.startCellEditMode({ id: params.id, field: params.field });
    }
  }

  function handleRowUpdateError(error) {
    // console.log('ERROR!', error);
  }

  const key = useStateProperty(0);

  React.useEffect(() => {
    const handleResize = () => key.set(key.get + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function getRowId(row) {
    return row.name;
  }

  // ===== DRAG & DROP LOGIC =====
  function handleDragStart(e, rowId) {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleTouchStart(e, rowId) {
    if (!e.cancelable) return;

    document.body.style.overscrollBehaviorY = 'none';
    setDraggedRowId(rowId);

    // Создаем ghost элемент
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none; left: 20px; top: 20px;
      width: 220px; height: 60px; border-radius: 12px;
      background: linear-gradient(135deg, #1976d2, #42a5f5);
      box-shadow: 0 10px 30px rgba(25,118,210,0.4);
      display: flex; align-items: center; padding: 0 16px;
      color: white; font-weight: 600; font-size: 14px;
      backdrop-filter: blur(10px);
    `;
    ghost.textContent = `Перетаскиваю: ${rowId}`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
  }

  function handleTouchMove(e) {
    if (!draggedRowId || !dragGhostRef.current) return;

    const touch = e.touches[0];
    const ghost = dragGhostRef.current;

    ghost.style.left = `${touch.clientX - 110}px`;
    ghost.style.top = `${touch.clientY - 30}px`;

    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = targetElement?.closest('.MuiDataGrid-row');
    const newTargetId = targetRow?.getAttribute('data-id');

    if (newTargetId && newTargetId !== draggedRowId && newTargetId !== dropTargetId.current) {
      dropTargetId.current = newTargetId;
      updateDropTarget(newTargetId);
    }
  }

  function handleTouchEnd(e) {
    if (!draggedRowId) return;

    const touch = e.changedTouches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRowId = targetElement?.closest('.MuiDataGrid-row')?.getAttribute('data-id');

    if (targetRowId && targetRowId !== draggedRowId) {
      moveRow(draggedRowId, targetRowId);
    }

    cleanupDrag();
  }

  function moveRow(sourceId, targetId) {
    const sourceIndex = rows.get.findIndex(row => getRowId(row) === sourceId);
    const targetIndex = rows.get.findIndex(row => getRowId(row) === targetId);

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    const newRows = [...rows.get];
    const [movedRow] = newRows.splice(sourceIndex, 1);
    newRows.splice(targetIndex, 0, movedRow);
    rows.set(newRows);
  }

  function updateDropTarget(targetId) {
    document.querySelectorAll('.drop-highlight').forEach(el => {
      el.classList.remove('drop-highlight');
    });
    const targetRow = document.querySelector(`[data-id="${targetId}"]`);
    if (targetRow) targetRow.classList.add('drop-highlight');
  }

  function cleanupDrag() {
    setDraggedRowId(null);
    dropTargetId.current = null;

    if (dragGhostRef.current) {
      document.body.removeChild(dragGhostRef.current);
      dragGhostRef.current = null;
    }

    document.body.style.overscrollBehaviorY = '';
    document.querySelectorAll('.drop-highlight').forEach(el => {
      el.classList.remove('drop-highlight');
    });
  }

  // ПК Drag & Drop обработчики
  React.useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
      e.preventDefault();
      const rowId = e.dataTransfer.getData('text/plain');
      const targetId = e.currentTarget.getAttribute('data-id');
      if (rowId && targetId && rowId !== targetId) {
        moveRow(rowId, targetId);
      }
      cleanupDrag();
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [rows]);

  return (
    <DataGrid
      sx={ResponsibleDataGrid}
      key={key.get}
      apiRef={gridApi}
      rows={rows.get}
      editMode="cell"
      disableColumnMenu={true}
      hideFooterSelectedRowCount={true}
      disableRowSelectionOnClick={true}
      showCellVerticalBorder={true}
      showColumnVerticalBorder={true}
      showToolbar={true}
      hideFooter={true}
      rowHeight={56}
      onCellClick={handleCellClick}
      getRowId={getRowId}
      processRowUpdate={handleProcessRowUpdate}
      onProcessRowUpdateError={handleRowUpdateError}
      columns={[
        {
          field: 'drag', headerName: 'drag', editable: false, sortable: false, width: 50,
          renderCell: (params) => (
            <Box sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              touchAction: 'none !important',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <Box
                draggable={true}
                onDragStart={(e) => handleDragStart(e, getRowId(params.row))}
                onTouchStart={(e) => handleTouchStart(e, getRowId(params.row))}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                sx={{
                  height: '36px',
                  width: '36px',
                  background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
                  borderRadius: '6px',
                  cursor: 'grab',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  touchAction: 'none !important',
                  '&:active': {
                    transform: 'scale(0.95)',
                    background: '#d0d0d0'
                  }
                }}
              >
                <Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
                <Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
                <Box sx={{ width: 3, height: 10, bgcolor: 'grey.600', borderRadius: 1 }} />
              </Box>
            </Box>
          )
        },
        {
          field: 'name', headerName: 'Название', editable: true, sortable: false, flex: 1,
          valueGetter: (value) => value ?? '',
        },
        {
          field: 'type', headerName: 'Тип', editable: true, type: 'singleSelect', sortable: false, width: 80,
          valueOptions: ['uint8', 'uint16', 'uint32'], // Добавил варианты
          valueSetter: (value, row) => ({ ...row, type: value, bit: null }),
        },
        {
          field: 'bit', headerName: 'Бит', editable: true, type: 'singleSelect', width: 60, sortable: false,
          valueOptions: (params) => {
            const maxBitValue = 15 * 8;
            const bits = ['-'];
            for (let i = 0; i < maxBitValue; i++) bits.push(i);
            return bits;
          },
          valueGetter: (value) => value == null ? '-' : `${value}`,
          valueFormatter: (value) => value == '-' ? '' : `${value}`,
        },
        { field: 'description', headerName: 'Описание', editable: true, flex: 1 },
      ]}
    />
  )
}

const ResponsibleDataGrid = css`
  overscroll-behavior-y: none;
  
  & .MuiDataGrid-row {
    transition: all 0.25s ease !important;
    min-height: 56px !important;
    touch-action: manipulation !important;
    
    &[data-id] {
      position: relative;
    }
    
    &.drop-highlight {
      background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%) !important;
      transform: translateY(-2px) scale(1.01) !important;
      box-shadow: 0 8px 25px rgba(33, 150, 243, 0.3) !important;
      border-left: 4px solid #2196f3 !important;
      z-index: 10 !important;
    }
  }
  
  @media(max-width: 768px) {
    .toolBar > * {
      display: flex;
      flex-direction: column;
    }
    .MuiDataGrid-row {
      min-height: 64px !important;
    }
  }
  
  & .duplicate-warning {
    background: linear-gradient(90deg, #fff3cd 0%, #ffeaa7 100%) !important;
    box-shadow: inset 0 0 0 2px #ffc107;
    animation: duplicatePulse 1.5s infinite;
  }
  
  @keyframes duplicatePulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.7;
      transform: scale(1.02);
    }
  }
`;

// useStateProperty и Register БЕЗ ИЗМЕНЕНИЙ
function useStateProperty(initialValue, debugText = '') {
  const [state, setState] = React.useState(initialValue);
  const setter = (value) => {
    if (debugText != '') {
      console.info(debugText, value);
    }
    setState(value);
  };
  return {
    get: state,
    set: setter,
    setPartial: (partial) => {
      setter({ ...state, ...partial });
    },
    setInitial: () => setter(initialValue),
  };
}

class Register {
  constructor(name, type, bit, writable, description) {
    this.name = name;
    this.type = type;
    this.bit = bit;
    this.writable = writable;
    this.description = description;
  }
}

export default App
