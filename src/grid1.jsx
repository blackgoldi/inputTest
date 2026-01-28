import { Box, ButtonGroup, Button, css } from '@mui/material';
import { DataGrid, GridCellModes, useGridApiRef } from '@mui/x-data-grid'
import React from 'react';
import { Register, useStateProperty, model } from './model.js';

export function Grid1({ }) {

	const rows = useStateProperty(model);

	const gridApi = useGridApiRef();
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
		setDraggedRowId(rowId);


		// Создаем ghost изображение ТОЛЬКО для ПК (не добавляем в DOM)
		const ghost = document.createElement('div');
		ghost.id = 'drag-ghost';
		ghost.style.cssText = `
	width: 220px; height: 60px; border-radius: 12px;
	background: linear-gradient(135deg, #1976d2, #42a5f5);
	box-shadow: 0 10px 30px rgba(25,118,210,0.4);
	display: flex; align-items: center; padding: 0 16px;
	color: white; font-weight: 600; font-size: 14px;
	backdrop-filter: blur(10px);
	pointer-events: none;
	`;
		ghost.textContent = `Перетаскиваю: ${rowId}`;

		// НЕ добавляем в body - используем только для setDragImage
		document.body.appendChild(ghost);
		dragGhostRef.current = ghost;

		e.dataTransfer.setData('text/plain', rowId);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setDragImage(ghost, 0, 0);

		// Удаляем ghost через микрозадержку (для корректной работы setDragImage)
		requestAnimationFrame(() => {
			if (dragGhostRef.current) {
				document.body.removeChild(dragGhostRef.current);
				dragGhostRef.current = null;
			}
		});
	}

	function handleTouchStart(e, rowId) {
		if (!e.cancelable) return;

		document.body.style.overscrollBehaviorY = 'none';
		setDraggedRowId(rowId);

		// Создаем ghost элемент для мобильных
		const ghost = document.createElement('div');
		ghost.id = 'drag-ghost';
		ghost.style.cssText = `
	  position: fixed; 
	  z-index: 9999; 
	  pointer-events: none; 
	  left: 20px; top: 20px;
	  width: 220px; 
	  height: 60px; 
	  border-radius: 12px;
	  background: linear-gradient(135deg, #1976d2, #42a5f5);
	  box-shadow: 0 10px 30px rgba(25,118,210,0.4);
	  display: flex; 
	  align-items: center; 
	  padding: 0 16px;
	  opacity: 0.5;
	  color: white; 
	  font-weight: 600; 
	  font-size: 14px;
	  backdrop-filter: blur(10px);
	`;
		ghost.textContent = `Перетаскиваю: ${rowId}. Встану на место ${lastIndicatorTargetId.current}`;
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
		if (!draggedRowId) return;

		const touch = e.changedTouches[0];
		const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
		const targetRowId = targetElement?.closest('.MuiDataGrid-row')?.getAttribute('data-id');

		if (targetRowId && targetRowId !== draggedRowId) {
			// ✅ Точное позиционирование и для touch
			const targetRow = document.querySelector(`[data-id="${targetRowId}"]`);
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

		if (dragGhostRef.current) {
			try {
				document.body.removeChild(dragGhostRef.current);
			} catch (e) { }
			dragGhostRef.current = null;
		}

		document.body.style.overscrollBehaviorY = '';
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

		const targetRow = document.querySelector(`[data-id="${targetId}"]`);
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

		const handleDragEnter = (e) => e.preventDefault();
		const handleDragLeave = () => { };

		const handleDrop = (e) => {
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

		const gridContainer = document.querySelector('.MuiDataGrid-root');
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
					field: 'drag', headerName: 'drag', editable: false, sortable: false,
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
