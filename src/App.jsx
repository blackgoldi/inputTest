import { Box, ButtonGroup, Button, css } from '@mui/material';

import { DataGrid, GridActionsCellItem, GridCellModes, GridRow, Toolbar, useGridApiRef } from '@mui/x-data-grid'
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

  const draggedRowId = useStateProperty(null);
  const isDragging = useStateProperty(false);
  const dragGhostRef = React.useRef(null);
  const dropTargetId = React.useRef(null);

  /**
   * @param {Register} newRow 
   * @param {Register} oldRow 
   */
  function handleProcessRowUpdate(newRow, oldRow) {
    const isUpdate = Object.entries(oldRow).some(([key, value]) => newRow[key] != value);
    if (isUpdate) {
      const index = rows.get.indexOf(rows.get.find(row => getRowId(row) == getRowId(oldRow)));
      const newRows = [...rows.get];
      newRows[index] = new Register(newRow.name, newRow.type, newRow.bit, newRow.writable, newRow.description);
      rows.set(newRows);
      return newRow; // Возвращаем обновленный ряд для применения изменений
    } else {
      return oldRow;
    }
  };

  function handleCellClick(params, event) {
    if (event.target.nodeType === 1 && !event.currentTarget.contains(event.target)) return;

    if (params.isEditable && gridApi.current.getCellMode(params.id, params.field) == GridCellModes.View) {
      gridApi.current.startCellEditMode({ id: params.id, field: params.field });
    }
  }

  function handleRowUpdateError(error) {
    // console.log('ERROR!', error);
  };

  function getRowId(row) {
    return row.name;
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
      el.style.transform = '';
    });
    const targetRow = document.querySelector(`[data-id="${targetId}"]`);
    if (targetRow) {
      targetRow.classList.add('drop-highlight');
      targetRow.style.transform = 'scale(1.02)';
      setTimeout(() => {
        if (targetRow.classList.contains('drop-highlight')) {
          targetRow.style.transform = '';
        }
      }, 200);
    }
  }

  function cleanupDrag() {
    draggedRowId.set(null);
    isDragging.set(false);
    dropTargetId.current = null;

    if (dragGhostRef.current) {
      const ghost = dragGhostRef.current;
      ghost.style.transition = 'all 0.3s ease';
      ghost.style.opacity = '0';
      ghost.style.transform = 'scale(0.8)';
      setTimeout(() => {
        if (ghost.parentNode) {
          document.body.removeChild(ghost);
        }
        dragGhostRef.current = null;
      }, 300);
    }

    document.body.style.overscrollBehaviorY = '';
    document.body.style.userSelect = '';
    document.querySelectorAll('.drop-highlight').forEach(el => {
      el.classList.remove('drop-highlight');
      el.style.transform = '';
    });
  }


  const handleDragStart = React.useCallback((e, rowId) => {
    e.preventDefault();
    e.stopPropagation();
    draggedRowId.set(rowId);
    isDragging.set(true);

    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none;
      width: 220px; height: 60px; border-radius: 12px;
      background: linear-gradient(135deg, #1976d2, #42a5f5);
      box-shadow: 0 10px 30px rgba(25,118,210,0.4);
      display: flex; align-items: center; padding: 0 16px;
      color: white; font-weight: 600; font-size: 14px;
      transform: translate(-50%, -50%);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    ghost.textContent = `Перетаскиваю: ${rowId}`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;

    document.body.style.overscrollBehaviorY = 'none';
    document.body.style.userSelect = 'none';
  }, []);

  React.useEffect(() => {
    if (!draggedRowId.get || !isDragging.get) return;

    const handleMove = (e) => {
      e.preventDefault();
      const clientX = e.touches?.[0]?.clientX || e.clientX;
      const clientY = e.touches?.[0]?.clientY || e.clientY;

      if (dragGhostRef.current) {
        dragGhostRef.current.style.left = `${clientX}px`;
        dragGhostRef.current.style.top = `${clientY}px`;
      }

      const targetElement = document.elementFromPoint(clientX, clientY);
      const targetRow = targetElement?.closest('.MuiDataGrid-row');
      const newTargetId = targetRow?.getAttribute('data-id');

      if (newTargetId && newTargetId !== draggedRowId.get && newTargetId !== dropTargetId.current) {
        dropTargetId.current = newTargetId;
        updateDropTarget(newTargetId);
      }
    };

    const handleEnd = () => {
      const rect = dragGhostRef.current?.getBoundingClientRect();
      if (rect) {
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const targetElement = document.elementFromPoint(clientX, clientY);
        const targetRowId = targetElement?.closest('.MuiDataGrid-row')?.getAttribute('data-id');

        if (targetRowId && targetRowId !== draggedRowId.get) {
          moveRow(draggedRowId.get, targetRowId);
        }
      }
      cleanupDrag();
    };

    document.addEventListener('pointermove', handleMove, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [draggedRowId.get, isDragging.get]);


  return (
    <DataGrid
      sx={ResponsibleDataGrid}
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
      onCellClick={handleCellClick}
      getRowId={getRowId}
      processRowUpdate={handleProcessRowUpdate}
      onProcessRowUpdateError={handleRowUpdateError}
      columns={[
        {
          field: 'drag', headerName: 'drag', editable: false, sortable: false, resizable: false,
          renderCell: (params) =>
            <Box draggable={true}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none !important',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: isDragging.get ? 'grabbing' : 'grab'
              }}
              onPointerDown={(e) => handleDragStart(e, getRowId(params.row))}
              onMouseDown={(e) => handleDragStart(e, getRowId(params.row))}
              onTouchStart={(e) => handleDragStart(e, getRowId(params.row))}
            >
              <Box sx={{
                height: '36px',
                width: '36px',
                background: isDragging.get
                  ? 'linear-gradient(180deg, #d0d0d0 0%, #b0b0b0 100%)'
                  : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                touchAction: 'none !important',
                '&:active': {
                  transform: 'scale(0.95)',
                }
              }}>
              </Box>
            </Box>
        },
        {
          field: 'name', headerName: 'Название', editable: true, sortable: false, flex: 1,
          valueGetter: (value) => {
            if (value != null) {
              return value;
            }
          },
        },
        {
          field: 'type', headerName: 'Тип', editable: true, type: 'singleSelect', sortable: false, width: 80, valueOptions: Object.values([]),
          valueSetter: (value, row) => ({ ...row, type: value, bit: null }),
        },
        {
          field: 'bit', headerName: 'Бит', editable: true, type: 'singleSelect', width: 60, sortable: false,
          valueOptions: (params) => {
            const maxBitValue = 15 * 8;
            const bits = [];
            bits.push('-');
            for (let i = 0; i < maxBitValue; i++) {
              bits.push(i);
            }
            return bits;
          },
          valueGetter: (value) => value == null ? '-' : `${value}`,
          valueFormatter: (value) => value == '-' ? '' : `${value}`, // только пока не работает с селектом
        },
        { field: 'description', headerName: 'Описание', editable: true, flex: 1 },
      ]}
    />
  )
}

const ResponsibleDataGrid = css`
  overscroll-behavior-y: none;
  
  & .MuiDataGrid-row {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    min-height: 56px !important;
    touch-action: manipulation !important;
    
    &.drop-highlight {
      background: linear-gradient(90deg, #e3f2fd, #bbdefb) !important;
      box-shadow: 0 4px 20px rgba(33, 150, 243, 0.3) !important;
      transform: scale(1.02) !important;
    }
  }
  
  & .MuiDataGrid-row:hover {
    background-color: rgba(33, 150, 243, 0.08) !important;
  }
  
  @media(max-width: 768px) {
    .MuiDataGrid-toolbar > * {
      display: flex;
      flex-direction: column;
    }
  }
`;

/**
 * @template T
 * @param {T} initialValue
 * @param {String} debugText
 */
function useStateProperty(initialValue, debugText = '') {
  const [state, setState] = React.useState(initialValue);
  /**
   * @param {T|((prev_val:T)=>T)} value
   */
  const setter = (value) => {
    //console.info('set' + debugText, value);
    if (debugText != '') {
      console.info(debugText, value);
    }
    setState(value);
  };
  return {
    get: state,
    set: setter,
    /**
     * @param {Partial<T>} partial
     * @description только для анонимных типов (т.к. для создания НЕ анонимных нужно использовать new T())
     */
    setPartial: (partial) => {
      //setter(Object.assign(state, partial));  не создает новый экземпляр
      setter({ ...state, ...partial });
    },
    setInitial: () => setter(initialValue),
  };
}

class Register {

  /**
   * @param {String} name 
   * @param {String} type 
   * @param {Number?} bit 
   * @param {Boolean} writable
   * @param {String} description 
   */
  constructor(name, type, bit, writable, description) {
    this.name = name;
    this.type = type;
    this.bit = bit;
    this.writable = writable;
    this.description = description;
  }

}

export default App
