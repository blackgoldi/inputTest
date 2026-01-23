import { Box, ButtonGroup, Button, css } from '@mui/material';
import { DataGrid, GridCellModes, useGridApiRef } from '@mui/x-data-grid'
import React from 'react';
import { Register, useStateProperty, model } from './model.js';

export function Grid({ }) {

	const rows = useStateProperty(model);

	// ✅ Добавьте после ref'ов:
	const customGhost = React.useRef(null);
	const ghostMoveHandler = React.useRef(null);

	// ✅ ЕДИНАЯ ФУНКЦИЯ для ВСЕХ устройств
	function createGhost(rowId, isTouch = false) {
		// Очистка старого
		if (customGhost.current) {
			document.body.removeChild(customGhost.current);
		}

		const ghost = document.createElement('div');
		ghost.id = 'custom-drag-ghost';

		ghost.innerHTML = `
    <div style="
      width:24px;height:36px;margin-right:12px;display:flex;flex-direction:column;
      justify-content:center;gap:2px;
    ">
      <div style="width:3px;height:10px;background:#fff;border-radius:1px;"></div>
      <div style="width:3px;height:10px;background:#fff;border-radius:1px;"></div>
      <div style="width:3px;height:10px;background:#fff;border-radius:1px;"></div>
    </div>
    <span style="font-weight:600;font-size:14px;line-height:1.2;">
      Перетаскиваю: <strong>${rowId}</strong>
    </span>
  `;

		ghost.style.cssText = `
    position:fixed;z-index:99999;pointer-events:none;
    width:240px;height:64px;border-radius:12px;
    background:linear-gradient(135deg,#1976d2 0%,#42a5f5 50%,#2196f5 100%);
    box-shadow:0 12px 40px rgba(25,118,210,.5);
    backdrop-filter:blur(12px);display:flex;align-items:center;padding:12px 16px;
    color:#fff;font-family:system-ui,-apple-system,sans-serif;opacity:1;
    ${isTouch ? 'transform:scale(1.05);' : ''}
  `;

		document.body.appendChild(ghost);
		customGhost.current = ghost;

		// Функция перемещения
		const moveGhost = isTouch ? (e) => {
			const touch = e.touches[0];
			ghost.style.left = `${touch.clientX - 120}px`;
			ghost.style.top = `${touch.clientY - 32}px`;
		} : (e) => {
			ghost.style.left = `${e.clientX - 120}px`;
			ghost.style.top = `${e.clientY - 32}px`;
		};

		ghostMoveHandler.current = moveGhost;
		return moveGhost;
	}

	const gridApi = useGridApiRef();
	const gridRef = React.useRef(null);

	const [draggedRowId, setDraggedRowId] = React.useState(null);
	const dragGhostRef = React.useRef(null);
	const dropTargetId = React.useRef(null);

	const dropIndicatorEl = React.useRef(null);
	const lastIndicatorTargetId = React.useRef(null);
	let lastIndicatorPosition = null;

	/**
	 * @param {Register} newRow 
	 * @param {Register} oldRow 
	 */
	function handleProcessRowUpdate(newRow, oldRow) {
		const index = rows.get.findIndex(row => getRowId(row) == getRowId(oldRow));
		if (index !== -1) {
			const newRows = [...rows.get];
			newRows[index] = new Register(newRow.name, newRow.type, newRow.bit, newRow.writable, newRow.description);
			rows.set(newRows);
			return newRow;
		}
		return oldRow;
	}

	function handleCellClick(params, event) {
		if (event.target.nodeType == 1 && !event.currentTarget.contains(event.target)) return;

		if (params.isEditable && gridApi.current.getCellMode(params.id, params.field) == GridCellModes.View) {
			gridApi.current.startCellEditMode({ id: params.id, field: params.field });
		}
	}

	function handleRowUpdateError(error) {
		// console.log('ERROR!', error);
	}

	function getRowId(row) {
		return row.name;
	}

	// ==== ЕДИНАЯ DRAG & DROP ЛОГИКА ====
	function handleDragStart(e, rowId) {
		console.log('drag start');
		setDraggedRowId(rowId);

		const moveGhost = createGhost(rowId, false); // ПК
		document.addEventListener('mousemove', moveGhost);

		document.addEventListener('dragend', () => {
			document.removeEventListener('mousemove', moveGhost);
			if (customGhost.current) {
				document.body.removeChild(customGhost.current);
				customGhost.current = null;
			}
		}, { once: true });

		// БЕЗ setDragImage - браузерный ghost не нужен
		e.dataTransfer.setData('text/plain', rowId);
		e.dataTransfer.effectAllowed = 'move';
	}

	function handleTouchStart(e, rowId) {
		console.log('touch start');
		if (!e.cancelable) return;

		document.body.style.overscrollBehaviorY = 'none';
		setDraggedRowId(rowId);

		const moveGhost = createGhost(rowId, true); // Touch
		document.addEventListener('touchmove', moveGhost, { passive: false });

		document.addEventListener('touchend', () => {
			document.removeEventListener('touchmove', moveGhost);
			if (customGhost.current) {
				document.body.removeChild(customGhost.current);
				customGhost.current = null;
			}
		}, { once: true });
	}

	function handleTouchMove(e) {
		console.log('touch move');
		if (!draggedRowId || !dragGhostRef.current) return;

		const touch = e.touches[0];
		const ghost = dragGhostRef.current;

		ghost.style.left = `${touch.clientX - 110}px`;
		ghost.style.top = `${touch.clientY - 30}px`;

		const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
		const targetRow = targetElement?.closest('.MuiDataGrid-row');
		const newTargetId = targetRow?.getAttribute('data-id');

		if (newTargetId && newTargetId !== draggedRowId) {
			// ✅ Для мобильных определяем позицию вставки
			const rect = targetRow.getBoundingClientRect();
			const y = touch.clientY - rect.top;
			const position = y < rect.height / 2 ? 'above' : 'below';
			dropTargetId.current = newTargetId;
			updateDropIndicator(newTargetId, position);
		}
	}

	function handleTouchEnd(e) {
		console.log('touch end');
		if (!draggedRowId) return;
		const touch = e.changedTouches[0];
		const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
		const targetRowId = targetElement?.closest('.MuiDataGrid-row')?.getAttribute('data-id');

		if (targetRowId && targetRowId !== draggedRowId) {
			// ✅ Точное позиционирование и для touch
			const targetRow = gridRef.current.querySelector(`[data-id="${targetRowId}"]`);
			const rect = targetRow.getBoundingClientRect();
			const position = touch.clientY - rect.top < rect.height / 2 ? 0 : 1;
			moveRowToPosition(draggedRowId, targetRowId, position);
		}

		cleanupDrag();
	}

	function cleanupDrag() {
		setDraggedRowId(null);
		dropTargetId.current = null;

		if (dropIndicatorEl.current) {
			dropIndicatorEl.current.style.display = 'none';
		}
		lastIndicatorTargetId.current = null;
		lastIndicatorPosition = null;

		// Ghost очищается автоматически в dragend/touchend
	}

	// Замените функцию updateDropTarget:
	function updateDropIndicator(targetId, position) {
		if (!targetId || !position) {
			if (dropIndicatorEl.current) {
				dropIndicatorEl.current.style.display = 'none';
			}
			lastIndicatorTargetId.current = null;
			lastIndicatorPosition = null;
			return;
		}

		const targetRow = gridRef.current.querySelector(`[data-id="${targetId}"]`);
		if (!targetRow) return;

		// ✅ Создаем индикатор ТОЛЬКО ОДИН РАЗ
		if (!dropIndicatorEl.current) {
			dropIndicatorEl.current = document.createElement('div');
			dropIndicatorEl.current.className = 'drop-indicator';
			dropIndicatorEl.current.style.cssText = `
				  position: fixed !important;
				  height: 4px;
				  background: linear-gradient(90deg, #2196f3, #42a5f5) !important;
				  border-radius: 2px;
				  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
				  z-index: 10000 !important;
				  pointer-events: none !important;
				  display: none;
			`;
			document.body.appendChild(dropIndicatorEl.current);
		}

		// ✅ НЕ перемещаем если позиция не изменилась (убирает pixel hunting)
		const positionKey = `${targetId}-${position}`;
		if (lastIndicatorTargetId.current === targetId && lastIndicatorPosition === position) {
			return;
		}

		lastIndicatorTargetId.current = targetId;
		lastIndicatorPosition = position;

		// ✅ ТОЧНО позиционируем относительно границ строки
		const rect = targetRow.getBoundingClientRect();
		const indicatorTop = position === 'above' ? rect.top : rect.bottom;

		dropIndicatorEl.current.style.left = `${rect.left}px`;
		dropIndicatorEl.current.style.top = `${indicatorTop}px`;
		dropIndicatorEl.current.style.width = `${rect.width}px`;
		dropIndicatorEl.current.style.display = 'block';
	}


	function moveRowToPosition(sourceId, targetId, position) {
		const sourceIndex = rows.get.findIndex(row => getRowId(row) === sourceId);
		const targetIndex = rows.get.findIndex(row => getRowId(row) === targetId);

		if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

		const newRows = [...rows.get];
		const [movedRow] = newRows.splice(sourceIndex, 1);

		const newTargetIndex = newRows.findIndex(row => getRowId(row) === targetId);

		// position 0 = ПЕРЕД target, 1 = ПОСЛЕ target
		let insertIndex = position === 0 ? newTargetIndex : newTargetIndex + 1;

		// ✅ КРАЕВЫЕ СЛУЧАИ
		if (insertIndex < 0) insertIndex = 0;
		if (insertIndex > newRows.length) insertIndex = newRows.length;
		newRows.splice(insertIndex, 0, movedRow);
		rows.set(newRows);
	}

	// ==== ЕДИНЫЙ useEffect для всех drag событий ====
	React.useEffect(() => {
		if (!draggedRowId) return;

		const handleDragOver = (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';

			const targetRow = e.target.closest('.MuiDataGrid-row');
			if (targetRow) {
				const targetId = targetRow.getAttribute('data-id');
				if (targetId && targetId !== draggedRowId) {
					const rect = targetRow.getBoundingClientRect();
					const y = e.clientY - rect.top;
					const position = y < rect.height / 2 ? 'above' : 'below';
					updateDropIndicator(targetId, position);
				}
			}
		};

		const handleDrop = (e) => {
			console.log('drop');
			e.preventDefault();
			const rowId = e.dataTransfer.getData('text/plain');
			const targetRow = e.target.closest('.MuiDataGrid-row');
			const targetId = targetRow?.getAttribute('data-id');

			if (rowId && targetId && rowId !== targetId) {
				const rect = targetRow.getBoundingClientRect();
				const position = e.clientY - rect.top < rect.height / 2 ? 0 : 1;
				moveRowToPosition(rowId, targetId, position);
			}
			cleanupDrag();
		};

		const handleDragEnter = (e) => e.preventDefault();

		const handleDragLeave = (e) => { console.log('drag leave') };

		const gridContainer = gridRef.current;
		if (gridContainer) {
			gridContainer.addEventListener('dragover', handleDragOver);
			gridContainer.addEventListener('dragenter', handleDragEnter);
			gridContainer.addEventListener('dragleave', handleDragLeave);
			gridContainer.addEventListener('drop', handleDrop);
		}

		return () => {
			if (gridContainer) {
				gridContainer.removeEventListener('dragover', handleDragOver);
				gridContainer.removeEventListener('dragenter', handleDragEnter);
				gridContainer.removeEventListener('dragleave', handleDragLeave);
				gridContainer.removeEventListener('drop', handleDrop);
			}
		};
	}, [draggedRowId]);

	return (
		<DataGrid
			ref={gridRef}
			apiRef={gridApi}
			rows={rows.get}
			sx={ResponsibleDataGrid}
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
					field: 'drag', headerName: 'drag2', editable: false, sortable: false,
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
				{ field: 'name', headerName: 'Название', editable: true, sortable: false, flex: 1, valueGetter: (value) => value ?? '' },
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
  }
`;
