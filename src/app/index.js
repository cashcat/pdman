import React from 'react';
import ReactDom from 'react-dom';
import _object from 'lodash/object';
import electron from 'electron';
import {Icon, Tree, Context, Tab, Modal, Message, openModal, Input} from '../components';
import { addOnResize } from '../../src/utils/listener';
import { upgrade } from '../../src/utils/basedataupgrade';
import { moveArrayPosition } from '../../src/utils/array';
import Module from './container/module';
import Table from './container/table';
import DataType from './container/datatype';
import Database from './container/database';
import Relation from './container/relation';
import ExportImg from './ExportImg';
import MultipleUtils from './container/multipleopt/MultipleUtils';

import Setting from './Setting';

import './style/index.less';

const { ipcRenderer } = electron;
const { dialog } = electron.remote;
const moduleUtils = Module.Utils;
const tableUtils = Table.Utils;
const DataTypeUtils = DataType.DataTypeUtils;
const DatabaseUtils = Database.Utils;
const TreeNode = Tree.TreeNode;
const TabPane = Tab.TabPane;
const menus = [
  { name: '新增', key: 'new', icon: <Icon type='addfolder' style={{color: '#008000', marginRight: 5}}/>},
  { name: '重命名', key: 'rename', icon: <Icon type='fa-undo' style={{color: '#F96B36', marginRight: 5}}/> },
  { name: '删除', key: 'delete', icon: <Icon type='delete' style={{color: '#FF0000', marginRight: 5}}/> },
  { name: '复制', key: 'copy', icon: <Icon type='copy1' style={{color: '#0078D7', marginRight: 5}}/> },
  { name: '剪切', key: 'cut', icon: <Icon type='fa-cut' style={{color: '#D2B3AF', marginRight: 5}}/> },
  { name: '粘贴', key: 'paste', icon: <Icon type='fa-paste' style={{color: '#6968E1', marginRight: 5}}/> },
  { name: '打开', key: 'open', icon: <Icon type='folderopen' style={{color: '#C3D6E8', marginRight: 5}}/> },
];
export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.flag = true;
    this.state = {
      display: 'none',
      style: {},
      tools: 'file',
      tab: 'table',
      width: 1,
      left: 0,
      top: 0,
      contextDisplay: 'none',
      contextMenus: [],
      leftTabWidth: 0,
      toolsClickable: 'file',
      clicked: 'edit',
      //foldingTabs: [],
    };
    this.relationInstance = {};
    this.tableInstance = {};
  }
  componentDidMount() {
    /* eslint-disable */
    // 增加监听窗口大小的事件
    // console.log(this.props);
    // window.PDMan.loading(window, this.props);
    this.dom = ReactDom.findDOMNode(this.instance);
    this.weight = this.dom.getBoundingClientRect().width;
    this.leftTabDom = ReactDom.findDOMNode(this.leftTabInstance);
    addOnResize(this._setTabsWidth);
    /*document.onselectstart = (evt) => {
      // 阻止默认选中样式
      if (evt.target.tagName !== 'INPUT'
        && evt.target.tagName !== 'TEXTAREA'
        && evt.target.nodeName !== '#text'
        && evt.target.tagName !== 'PRE') {
        //evt.preventDefault();
      }
    };*/
    document.onkeydown = (e) => {
      if (e.shiftKey) {
        document.onselectstart = (evt) => {
          evt.preventDefault();
        };
      } else {
        document.onselectstart = () => {
          //evt.preventDefault();
        };
      }
    };
    document.onkeyup = () => {
      document.onselectstart = () => {
        //evt.preventDefault();
      };
    };
    document.onkeydown = (evt) => {
      if (evt.ctrlKey || evt.metaKey) {
        if (this.flag) {
          if (evt.code === 'KeyS') {
            this._saveAll();
          } else if(evt.code === 'KeyE') {
            // 关闭当前打开的tab
            const { show } = this.state;
            show && this._tabClose(show);
          }
        }
      }
    };
    // 增量更新老版项目文件
    upgrade(this.props.dataSource, (data, flag) => {
      if (flag) {
        // 判断是否是演示项目
        const { saveProject, project } = this.props;
        project && saveProject(`${project}.pdman.json`, {
          ...data,
        }, () => {
          Message.success({title: '项目基础数据已经成功自动更新到最新！'})
        });
      }
    });
  }
  componentWillReceiveProps(nextProps){
    if (nextProps.project !== this.props.project) {
      // window.PDMan.loading(window, nextProps);
    }
  }
  componentWillUnmount(){
    this.flag = false;
  }
  asyncRun = (events = [], errors) => {
    // 顺序执行方法，方法返回的必须是promise
    const asyncRunEvents = async () => {
      for (let i = 0; i< events.length; i++) {
        await events[i]().catch((err) => {
          errors.push(err);
        });
      }
    };
    return asyncRunEvents();
  };
  _getTabToFoldingTabs = () => {
    const { show, tabs = [] } = this.state;
    const tempTabs = tabs.filter(tab => tab.key !== show).filter(tab => !tab.folding);
    return tempTabs.length > 0 && tempTabs[tempTabs.length - 1];
  };
  _setTabsWidth = () => {
    const { tabs = [] } = this.state;
    this.weight = this.dom.getBoundingClientRect().width;
    // 根据父节点的don需要去校验tab的头列表能否完全显示
    // 每个头标题的宽度是151px
    // 获取当前显示的tabs数
    const tabShowLength = tabs.filter(tab => !tab.folding).length;
    const tabFoldingLength = tabs.filter(tab => tab.folding).length;
    if (this.weight - 25 < tabShowLength * 151) {
      // 将最后一个并且不是当前已经选中的tab放入折叠面板中
      const lastTab = this._getTabToFoldingTabs();
      this.flag && this.setState({
        tabs: tabs.map((tab) => {
          if (tab.key === lastTab.key) {
            return {
              ...tab,
              folding: true,
            };
          }
          return tab;
        }),
      });
    } else if ((tabFoldingLength !== 0)
      && (this.weight - 25 >= ((tabShowLength + 1) * 151))){
      const firstFoldingTab = tabs.filter(tab => tab.folding)[0];
      this.flag && this.setState({
        tabs: tabs.map((tab) => {
          if (firstFoldingTab && firstFoldingTab.key === tab.key) {
            return {
              ...tab,
              folding: false,
            };
          }
          return tab;
        }),
      });
    }
    this.flag && this.setState({
      leftTabWidth: this.leftTabDom.getBoundingClientRect().width,
    });
  };
  _showOpts = () => {
    const { display, style } = this.state;
    if (!display) {
      document.getElementById('index-menu').focus();
    }
    this.setState({
      display: !display ? 'none' : '',
      style: style.color ? {} : {
        color: '#FFFFFF',
        background: '#1A7DC4',
      },
    });
  };
  _closeSubMenu = () => {
    this.setState({
      display: 'none',
      style: {},
    });
  };
  _open = () => {
    const { openObject } = this.props;
    openObject('', () => {
      this.setState({
        tabs: [],
      });
    });
  };
  _create = () => {
    const { saveProject } = this.props;
    saveProject(undefined, undefined, undefined, undefined, () => {
      this.setState({
        tabs: [],
      });
    });
  };
  _saveAs = () => {
    const { saveProject, dataSource } = this.props;
    this._saveAll(() => {
      saveProject('', dataSource);
    });
  };
  _setting = () => {
    const { columnOrder, dataSource, project } = this.props;
    openModal(<Setting columnOrder={columnOrder} dataSource={dataSource} project={`${project}.pdman.json`}/>, {
      title: '配置默认数据',
      onOk: (modal, com) => {
        const { saveProject } = this.props;
        const data = com.getDataSource();
        saveProject(`${project}.pdman.json`, {
          ...dataSource,
          ...data,
        }, () => {
          modal && modal.close();
        });
      }
    });
  };
  _closeProject = () => {
    const { closeProject } = this.props;
    closeProject && closeProject();
  };
  _entitySave = () => {
    const { show } = this.state;
    const table = this.tableInstance[show];
    table && table.promiseSave((err) => {
      //Modal.success({title: '保存成功', message: '保存成功', width: 200})
      if (!err) {
        Message.success({title: '保存成功'});
      }
    }).catch(err => {
      Modal.error({title: '保存失败', message: err, width: 300});
    });
  };
  _getProjectName = (item) => {
    const tempItem = item.replace(/\\/g, '/');
    const tempArray = tempItem.split('/');
    return tempArray[tempArray.length - 1];
  };
  _saveAll = (callBack) => {
    const { project, saveProject, dataSource } = this.props;
    // 1.循环调用当前所有tab的保存方法, 并且返回的都是promise
    const relations = Object.keys(this.relationInstance)
      .filter(key => this.relationInstance[key])
      .map(key => this.relationInstance[key].promiseSave)
      .filter(fuc => !!fuc);
    const tables = Object.keys(this.tableInstance)
      .filter(key => this.tableInstance[key])
      .map(key => this.tableInstance[key].promiseSave)
      .filter(fuc => !!fuc);
    const functions = tables.concat(relations);
    if (functions.length > 0) {
      this.errors = [];
      this.asyncRun(functions, this.errors).then(() => {
        callBack && callBack();
        if (!this.errors || this.errors.length === 0) {
          //Modal.success({title: '保存成功', message: '保存成功', width: 200})
          !callBack && Message.success({title: '保存成功'});
        } else {
          Modal.error({title: '保存失败', message: this.errors.join(',')})
        }
      });
    } else {
      if (project) {
        !callBack && Message.success({title: '保存成功'});
        callBack && callBack();
      } else {
        saveProject('', dataSource);
      }
    }
    /*saveProject(`${project}.pdman.json`, dataSource, () => {
      this._closeSubMenu();
    });*/
  };
  _menuClick = (tools) => {
    if (tools === "openDev") {
      ipcRenderer.sendSync('headerType', 'openDev');
    } else if(tools === "plug"){
      Modal.error({
        title: '该功能暂不开放',
        message: '插件功能因为引用了第三方商业软件，该功能暂不开放，如需使用请联系我们！'
      })
    } else {
      this.setState({
        tools,
      });
    }
  };
  _leftTabChange = (tab) => {
    this.setState({
      tab,
    });
  };
  _closeLeftTab = () => {
    const { width } = this.state;
    this.setState({
      width: width === 0 ? 1 : 0,
    }, () => {
      this._setTabsWidth();
    });
  };
  _refresh = () => {
    Modal.confirm({
      title: '刷新提示',
      message: '重新加载数据会使未保存的数据丢失，是否要继续？',
      onOk: (modal) => {
        modal && modal.close();
        const { openObject, project } = this.props;
        openObject(project);
      },
      width: 350
    });
  };
  _saveRelation = () => {
    const { show } = this.state;
    this.relationInstance[show] && this.relationInstance[show].saveData(() => {
      //Modal.success({title: '保存成功', message: '保存成功', width: 200})
      Message.success({title: '保存成功'});
    });
  };
  _undo = () => {
    const { show } = this.state;
    this.relationInstance[show] && this.relationInstance[show].undo();
  };
  _redo = () => {
    const { show } = this.state;
    this.relationInstance[show] && this.relationInstance[show].redo();
  };
  _changeMode = (mode) => {
    const { show } = this.state;
    this.setState({
      clicked: mode,
    });
    this.relationInstance[show] && this.relationInstance[show].changeMode(mode);
  };
  _tabChange = () => {
    const { show, tabs } = this.state;
    let tempTools = 'file';
    if (show.includes('/关系图/')) {
      tempTools = 'map'
    } else if (show.endsWith('/fa-table')) {
      tempTools = 'entity';
    }
    tabs.length !== 0 && this.setState({
      toolsClickable: tempTools,
      tools: tempTools,
    })
  };
  _tabHeaderClick = (value) => {
    const { tabs = [] } = this.state;
    this.setState({
      show: value,
      tabs: tabs.map((tab) => {
        if (tab.key === value) {
          return {
            ...tab,
            folding: false,
          };
        }
        return tab;
      }),
    }, () => {
      this._setTabsWidth();
      this._tabChange();
    });
  };
  _getTabsAndShow = (datas, value) => {
    let tempTabs = [...datas];
    const index = datas.findIndex(tab => tab.key === value);
    return {
      show: datas[index - 1 < 0 ? index + 1 : index - 1],
      tabs: tempTabs.filter(tab => tab.key !== value),
    }
  };
  _checkShowTab = (tabs = [], show) => {
    // 如果显示的是收起的则需要更换显示的tab
    if (tabs.length > 0) {
      const showTabIndex = tabs.findIndex(tab => tab.key === show);
      const showTab = tabs[showTabIndex];
      if (!showTab.folding) {
        return show;
      }
      return this._checkShowTab(tabs,  tabs[showTabIndex === 0 ? 0 : (showTabIndex - 1)].key)
    }
    return show;
  };
  _tabClose = (value) => {
    const { tabs, show, tools } = this.state;
    const tempValue = [].concat(value);
    if (tempValue.length > 0) {
      const result =  tempValue.reduce((a, b) => {
        return this._getTabsAndShow(a.tabs, b);
      }, {tabs});
      this.setState({
        tabs: result.tabs,
        show: this._checkShowTab(result.tabs, ((show === value) && result.show && result.show.key) || show),
        tools: result.tabs.length === 0 ? 'file' : tools,
      }, () => {
        this._setTabsWidth();
        this._tabChange();
      });
    }
  };
  _getIconByKey = (type) => {
    let icon = '';
    switch (type) {
      case 'map&': icon = 'fa-wpforms'; break;
      case 'entity&': icon = 'fa-table'; break;
      case 'datatype&data&': icon = 'fa-viacoin'; break;
      case 'database&data&': icon = 'fa-database'; break;
      default: break;
    }
    return icon;
  };
  _getTabKey = (value, keyTypes = []) => {
    const currentType = keyTypes.filter(type => value.startsWith(type))[0];
    if (currentType) {
      return {
        value: value.split(currentType)[1],
        icon: this._getIconByKey(currentType),
      };
    }
    return {
      value: '',
      icon: '',
    };
  };
  _updateTabs = (module, table, value, newModule) => {
    const { tabs, show } = this.state;
    if (tabs && tabs.length > 0) {
      const oldValue = `${module}&${table}`;
      const newValue = `${newModule || module}&${value}`;
      this.setState({
        dataHistory: newModule ? {} : { oldName: table, newName: value },
        tabs: tabs.map((tab) => {
          if (tab.title === oldValue) {
            return {
              ...tab,
              title: newValue,
              key: `${newValue}/fa-table`,
              value: `entity&${newValue}`,
            };
          }
          return tab;
        }),
        show: show === `${oldValue}/fa-table` ? `${newValue}/fa-table` : show,
      }, () => {
        this._tabChange();
      });
    }
  };
  _getCpt = (value) => {
    if (value.startsWith('map&')) {
      return (<Relation />);
    } else if (value.startsWith('entity&')) {
      return (<Table />);
    }
    return '';
  };
  _getTabRealName = (value) => {
    const { dataSource } = this.props;
    const newTempValues = value.replace('&', '/').split('/');
    let tempTitle = value;
    const module = newTempValues[0];
    const entity = newTempValues[1];
    const moduleData = (dataSource.modules || []).filter(m => m.name === module)[0];
    let entityData = null;
    if (moduleData) {
      entityData = (moduleData.entities || []).filter(e => e.title === entity)[0];
    }
    if (entityData) {
      tempTitle = entityData && this._getTableNameByNameTemplate(entityData);
    } else {
      tempTitle = `${module}[${entity}]`
    }
    return tempTitle;
  }
  _onDoubleClick = (value) => {
    const { dataSource, project, saveProject } = this.props;
    if (value.startsWith('datatype&data&')) {
      DataTypeUtils.renameDataType(value.split('datatype&data&')[1], dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      });
    } else if (value.startsWith('database&data&')) {
        DatabaseUtils.renameDatabase(value.split('database&data&')[1], dataSource, (data) => {
          saveProject(`${project}.pdman.json`, data);
        });
    } else {
      const types = ['map&', 'entity&'];
      const tempValue = this._getTabKey(value, types);
      if (tempValue.value) {
        const { tabs = [] } = this.state;
        // 检查key是否已经存在
        let tempTabs = [...tabs];
        if (!tempTabs.some(tab => tab.key === `${tempValue.value}/${tempValue.icon}`)) {
          tempTabs.push(
            {
              title: tempValue.value,
              key: `${tempValue.value}/${tempValue.icon}`,
              value,
              icon: tempValue.icon,
              folding: false,
              com: this._getCpt(value, `${tempValue.value}/${tempValue.icon}`)
            });
        } else {
          tempTabs = tempTabs.map((tab) => {
            if (tab.key === `${tempValue.value}/${tempValue.icon}`) {
              return {
                ...tab,
                folding: false,
              };
            }
            return tab;
          });
        }
        this.setState({
          tabs: tempTabs,
          show: `${tempValue.value}/${tempValue.icon}`,
        }, () => {
          this._setTabsWidth();
          this._tabChange();
        });
      }
    }
  };
  _onContextMenu = (e, value, checked) => {
    let contextMenus = [];
    // 计算需要复制的内容
    if (checked.length > 1) {
      contextMenus = [{
        name: <span><Icon type='copy1' style={{color: '#0078D7', marginRight: 5}}/>复制</span>,
        key: `multiple&copy&${value}`,
        checked
        }]
    } else {
      if (value.startsWith('module&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}{menu.key === 'new' ? '新增模块' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&')));
      } else if (value.startsWith('map&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}打开关系图</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => menu.key.startsWith('open&')));
      } else if (value.startsWith('table&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{
              menu.key === 'new' ? <Icon type='fa-table' style={{color: '#008000', marginRight: 5}}/> : menu.icon
            }{menu.key === 'new' ? '新增数据表' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&') &&
          !menu.key.startsWith('delete&') && !menu.key.startsWith('rename&')));
      } else if (value.startsWith('datatype&data&')){
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}{menu.key === 'new' ? '新增数据类型' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&')));
      } else if (value.startsWith('database&data&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}{menu.key === 'new' ? '新增数据库' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&')));
      } else if (value.startsWith('entity&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{
              menu.key === 'new' ? <Icon type='fa-table' style={{color: '#008000', marginRight: 5}}/> : menu.icon
            }
              {menu.key === 'new' ? '新增数据表' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&')));
      } else if (value.startsWith('datatype&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}{menu.key === 'new' ? '新增数据类型' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&') && !menu.key.startsWith('rename&')));
      } else if (value.startsWith('database&')) {
        contextMenus = contextMenus.concat(menus.map((menu) => {
          return {
            ...menu,
            name: <span>{menu.icon}{menu.key === 'new' ? '新增数据库' : menu.name}</span>,
            key: `${menu.key}&${value}`,
          };
        }).filter(menu => !menu.key.startsWith('open&') && !menu.key.startsWith('rename&')));
      }
    }
    this.setState({
      left: e.clientX,
      top: e.clientY,
      contextDisplay: '',
      contextMenus,
    });
  };

  _closeContextMenu = () => {
    this.setState({
      contextDisplay: 'none',
    });
  };
  _contextClick = (e, key, menu) => {
    // 右键菜单的所有出口
    // key: new&module&name
    // 1.根据&裁剪
    const keyArray = key.split('&');
    if (keyArray[1]) {
      if (keyArray[1] === 'module') {
        this._handleModule(keyArray);
      } else if (keyArray[1] === 'table'
        || keyArray[1] === 'entity') {
        this.handleTable(keyArray);
      } else if (keyArray[1] === 'datatype') {
        this.handleDataType(keyArray);
      } else if (keyArray[1] === 'database') {
        this.handleDatabase(keyArray);
      } else if (keyArray[1] === 'map') {
        // 切换到关系图的Tab
        // open&map&qqq/关系图
        // map&qqq/关系图
        this._onDoubleClick(key.split('open&')[1]);
      } else {
        // 多选复制
        MultipleUtils.opt(key, menu, this.props.dataSource);
      }
    }
    // console.log(key);
  };
  handleDatabase = (key) => {
    const { dataSource, project, saveProject } = this.props;
    const optType = key[0];
    const databaseCode = key[3] || '';
    switch (optType) {
      case 'new': DatabaseUtils.addDatabase(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'rename': DatabaseUtils.renameDatabase(databaseCode, dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'delete':
        Modal.confirm(
          {
            title: '删除提示',
            message: `确定删除数据库【${databaseCode}】吗？删除后不可恢复！`,
            width: 400,
            onOk: (modal) => {
              modal && modal.close();
              DatabaseUtils.deleteDatabase(databaseCode, dataSource, (data) => {
                saveProject(`${project}.pdman.json`, data);
              });
            }
          });
        break;
      case 'copy': DatabaseUtils.copyDatabase(databaseCode, dataSource); break;
      case 'cut': DatabaseUtils.cutDatabase(databaseCode, dataSource); break;
      case 'paste': DatabaseUtils.pasteDatabase(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      default: break;
    }
  };
  handleDataType = (key) => {
    const { dataSource, project, saveProject } = this.props;
    const optType = key[0];
    const dataTypeCode = key[3] || '';
    switch (optType) {
      case 'new': DataTypeUtils.addDataType(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'rename': DataTypeUtils.renameDataType(dataTypeCode, dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'delete':
        Modal.confirm(
          {
            title: '删除提示',
            message: `确定删除数据类型【${dataTypeCode}】吗？删除后不可恢复！`,
            width: 400,
            onOk: (modal) => {
              modal && modal.close();
              DataTypeUtils.deleteDataType(dataTypeCode, dataSource, (data) => {
                saveProject(`${project}.pdman.json`, data);
              });
            }
          });
        break;
      case 'copy': DataTypeUtils.copyDataType(dataTypeCode, dataSource); break;
      case 'cut': DataTypeUtils.cutDataType(dataTypeCode, dataSource); break;
      case 'paste': DataTypeUtils.pasteDataType(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      default: break;
    }
  };
  handleTable = (key) => {
    const { dataSource, project, saveProject } = this.props;
    const optType = key[0];
    const module = key[2];
    const table = key[3] !== '数据表' ? key[3] : '';
    switch (optType) {
      case 'new': tableUtils.addTable(module, dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'rename': tableUtils.renameTable(module, table, dataSource, (data, dataHistory) => {
        saveProject(`${project}.pdman.json`, data, () => {
          const { tabs = [], show } = this.state;
          let tempShow = show;
          const newTable = dataHistory.newName;
          this.setState({
            tabs: tabs.map((tab) => {
              const key = tab.key.replace('/', '&').split('&');
              const module = key[0];
              const oldTable = key[1];
              if (oldTable === table) {
                // 检查当前tab是否已经显示
                const newKey = `${module}&${newTable}/fa-table`;
                if (tempShow === tab.key) {
                  tempShow = newKey;
                }
                return {
                  ...tab,
                  title: `${module}&${newTable}`,
                  key: newKey,
                  value: `entity&${module}&${newTable}`,
                };
              }
              return tab;
            }),
            show: show !== tempShow ? tempShow : show,
          })
        }, dataHistory);
      }); break;
      case 'delete':
        Modal.confirm(
          {
            title: '删除提示',
            message: `确定删除数据表【${table}】吗？删除后不可恢复！`,
            width: 400,
            onOk: (modal) => {
              modal && modal.close();
              tableUtils.deleteTable(module, table, dataSource, (data) => {
                saveProject(`${project}.pdman.json`, data, () => {
                  // 测试模块_Customer-fa-table
                  const { tabs = [] } = this.state;
                  if (tabs.map(tab => tab.key).includes(`${module}&${table}/fa-table`)) {
                    this._tabClose(`${module}&${table}/fa-table`);
                  }
                });
              });
            }
          });break;
      case 'copy': tableUtils.copyTable(module, table, dataSource); break;
      case 'cut': tableUtils.cutTable(module, table, dataSource); break;
      case 'paste': tableUtils.pasteTable(module, dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      default: break;
    }
  };
  _emptyClick = () => {
    const { dataSource, project, saveProject } = this.props;
    moduleUtils.addModule(dataSource, (data) => {
      saveProject(`${project}.pdman.json`, data);
    });
  };
  _handleModule = (key) => {
    const { dataSource, project, saveProject } = this.props;
    const optType = key[0];
    switch (optType) {
      case 'new': moduleUtils.addModule(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      case 'rename': moduleUtils.renameModule(key[2], dataSource, (data, newModule) => {
        saveProject(`${project}.pdman.json`, data, () => {
          // 如果有当前模块中已经打开的tab，则需要对其进行更新
          const { tabs = [], show } = this.state;
          const oldModule = key[2];
          let tempShow = show;
          this.setState({
            tabs: tabs.map((tab) => {
              const key = tab.key.replace('/', '&').split('&');
              const module = key[0];
              const table = key[1];
              if (module === oldModule) {
                // 关系图和实体的key的格式不一致
                const type = tab.key.includes('&') ? 'entity' : 'map';
                // 检查当前tab是否已经显示
                const newKey = type === 'entity' ? `${newModule}&${table}/fa-table` : `${newModule}/关系图/fa-wpforms`;
                if (tempShow === tab.key) {
                  tempShow = newKey;
                }
                return {
                  ...tab,
                  title: type === 'entity' ? `${newModule}&${table}` : `${newModule}/关系图`,
                  key: newKey,
                  value: type === 'entity' ? `entity&${newModule}&${table}` : `map&${newModule}/关系图`,
                };
              }
              return tab;
            }),
            show: show !== tempShow ? tempShow : show,
          })
        });
      }); break;
      case 'delete':
        Modal.confirm(
          {
            title: '删除提示',
            message: `确定删除模块【${key[2]}】吗？删除后不可恢复！`,
            width: 400,
            onOk: (modal) => {
              modal && modal.close();
              moduleUtils.deleteModule(key[2], dataSource, (data) => {
                saveProject(`${project}.pdman.json`, data, () => {
                  // 关闭该模块下的所有tab;
                  // map&qqq/关系图/fa-snowflake-o
                  // module&table/fa-table
                  // this._tabClose(`${module}&${table}/fa-table`);
                  const { tabs = [] } = this.state;
                  const keys = tabs.filter(tab => {
                    if (tab.key === `${key[2]}/关系图/fa-snowflake-o`) {
                      return true;
                    } else if (tab.key.startsWith(`${key[2]}&`)) {
                      return true;
                    }
                    return false;
                  }).map(tab => tab.key);
                  this._tabClose(keys);
                });
              })
            }
          });
        break;
      case 'copy': moduleUtils.copyModule(key[2], dataSource); break;
      case 'cut': moduleUtils.cutModule(key[2], dataSource); break;
      case 'paste': moduleUtils.pasteModule(dataSource, (data) => {
        saveProject(`${project}.pdman.json`, data);
      }); break;
      default: break;
    }
  };
  _onDrop = (drop, drag) => {
    // database&data&MySQL
    // datatype&data&DateTime
    const dropType = drop.split('&')[0];
    const dragType = drag.split('&')[0];
    if (dropType !== dragType) {
      Modal.error({title: '移动失败', message: '数据类型和数据库之间数据不可移动', width: 300})
    } else {
      const dropKey = drop.split('&')[2];
      const dragKey = drag.split('&')[2];
      const { dataSource, project, saveProject } = this.props;
      const datatype = _object.get(dataSource, `dataTypeDomains.${dropType}`, []);
      const dropIndex = datatype.findIndex(type => type.code === dropKey);
      const dragIndex = datatype.findIndex(type => type.code === dragKey);
      saveProject(`${project}.pdman.json`, {
        ...dataSource,
        dataTypeDomains: {
          ...dataSource.dataTypeDomains || {},
          [dropType]: moveArrayPosition(datatype, dragIndex, dropIndex)
        }
      })
    }
  };
  _onDataTableDrop = (drop, drag) => {
    if (drag.split('&')[0] === 'module') {
      const dragModule = drag.split('&')[1];
      if (drop.split('&')[0] !== 'module') {
        Modal.error({title: '移动失败', message: '模块不能与非模块之间移动'})
      } else {
        const dropModule = drop.split('&')[1];
        const { saveProject, dataSource, project } = this.props;
        const dragIndex = (dataSource.modules || []).findIndex(mo => mo.name === dragModule);
        const dropIndex = (dataSource.modules || []).findIndex(mo => mo.name === dropModule);
        saveProject(`${project}.pdman.json`, {
          ...dataSource,
          modules: moveArrayPosition(dataSource.modules || [], dragIndex, dropIndex),
        });
      }
    } else {
      // entity&测试模块&Emplyee
      const dropKeys = drop.split('&');
      const dragKeys = drag.split('&');
      const dropModule = dropKeys[1];
      const dragModule = dragKeys[1];
      const dropEntity = dropKeys[2];
      const dragEntity = dragKeys[2];
      // map&原型链/关系图 module&原型链 table&原型链&数据表 entity&原型链&test
      if (!dropEntity || !dragEntity) {
        let message = '无法移动非数据表！';
        if (!dropEntity) {
          message = '无法移动至非数据表！'
        }
        Modal.error({title: '移动失败', message: message, width: 200});
      } else if (dropModule !== dragModule && dropModule && dragModule) {
        /*Modal.confirm({
          title: '确定移动吗',
          message: '改变数据表的模块会删除当前模块中的关联关系，你确定要这样吗！',
          width: 500,
          onOk: () => {
// Modal.error({title: '移动失败', message: '无法跨模块移动数据表！', width: 200});
            // 跨模块移动操作
            // 当前模块删除
          },
          onCancel: () => {
          }
        });*/
        const { saveProject, dataSource, project } = this.props;
        // 获取将要移动的数据表
        const dragModuleData = (dataSource.modules || []).filter(module => module.name === dragModule)[0];
        const dragEntityData = (dragModuleData.entities || []).filter(entity => entity.title === dragEntity)[0];
        // 更新关系图中的节点信息
        // 1.获取所有的关系图节点界面
        Object.keys(this.relationInstance).forEach((r) => {
          // 2.循环更新所有的节点
          // 如果移动的表已经在该关系图中则将模块名置为空
          const relationModuleName = r.split('/')[0];
          if (relationModuleName === dragModule) {
            // 移动的模块
            // 获取所有的节点
            if (this.relationInstance[r]) {
              const nodes = this.relationInstance[r].getNodes();
              // 设置新的节点
              this.relationInstance[r].setNodes(nodes.map((n) => {
                if (n.title.split(':')[0] === dragEntity) {
                  return {
                    ...n,
                    moduleName: dropModule,
                  }
                }
                return n;
              }));
            }
          } else if(relationModuleName === dropModule){
            // 放置的模块
            // 获取所有的节点
            if (this.relationInstance[r]) {
              const nodes = this.relationInstance[r].getNodes();
              // 设置新的节点
              this.relationInstance[r].setNodes(nodes.map((n) => {
                if (n.title.split(':')[0] === dragEntity) {
                  return {
                    ...n,
                    moduleName: false,
                  }
                }
                return n;
              }));
            }
          }
        });
        saveProject(`${project}.pdman.json`, {
          ...dataSource,
          modules: (dataSource.modules || []).map((module) => {
            if (module.name === dragModule) {
              const tempEntities = [...(module.entities || [])];
              const dragIndex = tempEntities.findIndex(entity => entity.title === dragEntity);
              tempEntities.splice(dragIndex, 1);
              let graphCanvas = _object.get(module, 'graphCanvas', undefined);
              if (graphCanvas) {
                // 判断该模块的关系图中是否有此表
                graphCanvas = {
                  ...graphCanvas,
                  nodes: (graphCanvas.nodes || []).map((n) => {
                    if (n.title.split(':')[0] === dragEntity) {
                      return {
                        ...n,
                        moduleName: dropModule,
                      }
                    }
                    return n;
                  })
                }
              }
              return {
                ...module,
                entities: tempEntities,
                graphCanvas,
              };
            } else if (module.name === dropModule) {
              const tempEntities = [...(module.entities || [])];
              const dropIndex = tempEntities.findIndex(entity => entity.title === dropEntity);
              tempEntities.splice(dropIndex, 0, dragEntityData);
              let graphCanvas = _object.get(module, 'graphCanvas', undefined);
              if (graphCanvas) {
                // 判断该模块的关系图中是否有此表
                graphCanvas = {
                  ...graphCanvas,
                  nodes: (graphCanvas.nodes || []).map((n) => {
                    if (n.title.split(':')[0] === dragEntity) {
                      return {
                        ...n,
                        moduleName: false,
                      }
                    }
                    return n;
                  })
                }
              }
              return {
                ...module,
                entities: tempEntities,
                graphCanvas
              }
            }
            return module;
          })
        }, () => {
          this._updateTabs(dragModule, dragEntity, dragEntity, dropModule);
        });
        // 放置的模块新增
      } else {
        // 交换数据表的位置
        const { saveProject, dataSource, project } = this.props;
        saveProject(`${project}.pdman.json`, {
          ...dataSource,
          modules: (dataSource.modules || []).map((module) => {
            if (module.name === dragModule) {
              const entities = module.entities;
              const dragIndex = entities.findIndex(entity => entity.title === dragEntity);
              const dropIndex = entities.findIndex(entity => entity.title === dropEntity);
              return {
                ...module,
                entities: moveArrayPosition(entities, dragIndex, dropIndex),
              };
            }
            return module;
          })
        });
      }
    }
  };
  _getTableNameByNameTemplate = (entity) => {
    const nameTemplate = entity.nameTemplate || '{code}[{name}]';
    if (!nameTemplate) {
      return entity.chnname || entity.title;
    } else {
      return nameTemplate.replace(/\{(\w+)\}/g, (match, key) => {
        let tempKey = key;
        if (tempKey === 'code') {
          tempKey = 'title';
        } else if (tempKey === 'name') {
          tempKey = 'chnname';
        }
        return entity[tempKey];
      }) || entity.title;
    }
  };
  _onMouseDown = (event) => {
    this.moveUp = false;
    const downX = event.clientX;
    this.leftTabInstanceDom = ReactDom.findDOMNode(this.leftTabInstance);
    this.instanceDom = ReactDom.findDOMNode(this.instance);
    const react = this.leftTabInstanceDom.getBoundingClientRect();
    const offWidth = parseFloat(react.width) || 0;
    document.onmousemove = (e) => {
      if (!this.moveUp) {
        this.leftTabInstanceDom.style.width = `${offWidth - (downX - e.clientX)}px`;
        this.instanceDom.style.width = `calc(100% - ${offWidth - (downX - e.clientX)}px)`;
        if (this.treeInstance) {
          // 更新树的搜索框的宽度
          this.treeInstance.updateSearchWidth(offWidth - (downX - e.clientX));
        }
      } else {
        document.onmousemove = null;
      }
    };
    document.onmouseup = () => {
      this.moveUp = true;
    };
  };
  _onZoom = (zoom) => {
    const { show } = this.state;
    this.relationInstance[show] && this.relationInstance[show].onZoom(zoom);
  };
  _relationSearch = (e) => {
    const { show } = this.state;
    this.relationInstance[show] && this.relationInstance[show].searchNodes(e.target.value);
  };
  _exportImage = () => {
    openModal(<ExportImg/>, {
      title: '选择图片导出类型',
      onOk: (modal, com) => {
        modal.close();
        const type = com.getType();
        // 打开选择图片存储路径的对话框
        dialog.showSaveDialog({
          title: '选择图片存储路径',
          filters: [
            { name: 'image/jpg', extensions: ['jpg'] },
            { name: 'image/png', extensions: ['png'] },
          ],
        }, (file) => {
          if (file) {
            const { show } = this.state;
            this.relationInstance[show] && this.relationInstance[show].exportImg(file, type, () => {
              Message.success({title: '图片导出成功！'})
            });
          }
        });
      }
    });
  };
  render() {
    const { dataSource, project, saveProject, changeDataType,
      dataHistory, saveProjectSome, columnOrder, writeFile } = this.props;
    const { tools, tab, width, toolsClickable, show, clicked, tabs = [] } = this.state;
    return (
      <div style={{
        width: '100%',
        //height: 'calc(100% - 20px)',
        flexGrow: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <header>
          <div className="options-wrapper">
            {/*<div className="options-toggle-menu">
              <ul
                className="options-menu"
                tabIndex="0"
                onBlur={this._closeSubMenu}
                id="index-menu"
              >
                <li className="options-toggle-menu-main-menu" style={{...this.state.style}} onClick={this._showOpts}>
                  <span><u>文</u>件</span>
                </li>
                <ul className="options-toggle-menu-select-menu" style={{display: this.state.display}}>
                  <li onClick={this._open}>
                    <Icon type='folderopen'/>
                    <span>打开项目</span>
                  </li>
                  <li onClick={this._create}>
                    <Icon type='addfolder'/>
                    <span>新建项目</span>
                  </li>
                  <li onClick={this._saveAll}><Icon type='fa-save'/><span>保存项目</span></li>
                  <li onClick={this._save}><Icon type='fa-save'/><span>项目另存为</span></li>
                </ul>
              </ul>
            </div>*/}
            <div>
              <ul className="other-options-menu">
                <li
                  className={`other-options-menu-tools
                   ${tools === 'file' ? 'menu-tools-edit-active' : 'tools-content-enable-click'}`}
                  onClick={() => this._menuClick('file')}
                >
                  <span><u>文</u>件</span>
                </li>
                <li
                  className={`other-options-menu-tools
                   ${tabs.length > 0 && tools === 'map' ? 'menu-tools-edit-active' : ''}
                  ${tabs.length > 0 && toolsClickable === 'map' ? '' : 'tools-content-un-click'}`}
                  onClick={() => tabs.length > 0 && toolsClickable === 'map' && this._menuClick('map')}
                >
                  <span><u>关</u>系图</span>
                </li>
                <li
                  className={`other-options-menu-tools
                   ${tabs.length > 0 && tools === 'entity' ? 'menu-tools-edit-active' : ''}
                  ${tabs.length > 0 && toolsClickable === 'entity' ? '' : 'tools-content-un-click'}`}
                  onClick={() => tabs.length > 0 && toolsClickable === 'entity' && this._menuClick('entity')}
                >
                  <span><u>数</u>据表</span>
                </li>
                <li
                  className={`other-options-menu-tools ${tools === 'plug' ?
                    'menu-tools-edit-active' : 'tools-content-enable-click'}`}
                  onClick={() =>this._menuClick('plug')}
                >
                  <span><u>插</u>件</span>
                </li>
              </ul>
              <Icon
                type='logout'
                title='关闭当前项目'
                style={{float: 'right', marginRight: 5, paddingTop: 1, cursor: 'pointer'}}
                onClick={this._closeProject}
              />
            </div>
          </div>
        </header>
        <Context
          menus={this.state.contextMenus}
          left={this.state.left}
          top={this.state.top}
          display={this.state.contextDisplay}
          closeContextMenu={this._closeContextMenu}
          onClick={this._contextClick}
        />
        <div className="tools-content" style={{display: tools === 'dbversion' ? 'none' : ''}}>
          <div className="tools-content-tab" style={{display: tools === 'file' ? '' : 'none'}}>
            <div
              className='tools-content-clickeable'
              onClick={this._open}
            >
              <Icon type='folderopen' style={{marginRight: 5, color: '#FFCA28'}}/>打开
            </div>
            <div
              className='tools-content-clickeable'
              onClick={this._create}
            >
              <Icon type='addfolder' style={{marginRight: 5, color: '#96C080'}}/>新建
            </div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._saveAll()}
            >
              <Icon type='save' style={{marginRight: 5, color: '#7EA5EE'}}/>保存全部
            </div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._saveAs()}
            >
              <Icon type='fa-save' style={{marginRight: 5, color: '#9291CD'}}/>另存为
            </div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._setting()}
            >
              <Icon type='setting' style={{marginRight: 5}}/>设置
            </div>
          </div>
          <div className="tools-content-tab" style={{display: tabs.length > 0 && tools === 'map' ? '' : 'none'}}>
            <div className='tools-content-clickeable' onClick={this._saveRelation}><Icon type="save"/>保存</div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._onZoom('add')}
            >
              <Icon type="fa-search-plus"/>
              放大
            </div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._onZoom('normal')}
            >
              <Icon type="fa-search"/>
              1:1
            </div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._onZoom('sub')}
            >
              <Icon type="fa-search-minus"/>
              缩小
            </div>
            <div
              className={`tools-content-${clicked === 'drag' ? 'clicked' : 'clickeable'}`}
              onClick={() => this._changeMode('drag')}
            ><Icon type="fa-arrows"/>拖拽模式</div>
            <div
              className={`tools-content-${clicked === 'edit' ? 'clicked' : 'clickeable'}`}
              onClick={() => this._changeMode('edit')}
            ><Icon type="fa-edit"/>编辑模式</div>
            <div
              className='tools-content-clickeable'
              onClick={() => this._exportImage()}
            ><Icon type="fa-file-image-o"/>导出图片</div>
            <div
              className='tools-content-clickeable'
              style={{flexGrow: 1, textAlign: 'right'}}
            ><Input
              onChange={this._relationSearch}
              style={{margin: '10px 10px 0 0', borderRadius: 3}}
              placeholder='快速搜索节点'
            /></div>
          </div>
          <div className="tools-content-tab" style={{display: tabs.length > 0 && tools === 'entity' ? '' : 'none'}}>
            <div
              className='tools-content-clickeable'
              onClick={this._entitySave}
            ><Icon type="save"/>保存</div>
          </div>
        </div>
        <div className="tools-work-content" style={{display: tools === 'dbversion' ? 'none' : ''}}>
          <div
            className="tools-left-tab"
            style={{ width: width === 0 ? 20 : '20%', minWidth: width === 0 ? 20 : 200, background: '#EBEEF2' }}
            ref={instance => this.leftTabInstance = instance}
          >
            <div className="tools-left-tab-header">
              <div className="tools-left-tab-header-icons">
                <Icon title='收起左侧树图' type="verticleright" onClick={this._closeLeftTab}/>
                <Icon title='重新加载项目' type="reload1" onClick={this._refresh} style={{display: width === 0 ? 'none' : ''}}/>
              </div>
              <div className="tools-left-tab-header-tab-names" style={{display: width === 0 ? 'none' : ''}}>
                <span
                  className={`${tab === 'table' ? 'menu-tab-tools-edit-active' : ''}`}
                  onClick={() => this._leftTabChange('table')}
                ><Icon type='fa-th' style={{marginRight: 5}}/>数据表</span>
                <span
                  className={`${tab === 'domain' ? 'menu-tab-tools-edit-active' : ''}`}
                  onClick={() => this._leftTabChange('domain')}
                ><Icon type='fa-th-list' style={{marginRight: 5}}/>数据域</span>
              </div>
            </div>
            <div className="tools-left-tab-body" style={{display: width === 0 ? 'none' : ''}}>
              <div className="tools-left-tab-body-table" style={{display: tab === 'table' ? '' : 'none'}}>
                {
                  (dataSource.modules || []).length > 0 ? <Tree
                    showSearch
                    ref={instance => this.treeInstance = instance}
                    onContextMenu={this._onContextMenu}
                    onDoubleClick={this._onDoubleClick}
                    onDrop={this._onDataTableDrop}
                  >
                    {
                      (dataSource.modules || []).map((module) => {
                        const realName = module.chnname ? `${module.name}-${module.chnname}` : module.name;
                        return (<TreeNode
                          draggable
                          key={module.name}
                          realName={realName}
                          name={realName}
                          value={`module&${module.name}`}>
                          <TreeNode
                            name={<span><Icon
                              type='fa-wpforms'
                              style={{ marginRight: 2, color: '#50B011' }}
                            />关系图</span>}
                            value={`map&${module.name}/关系图`}/>
                          <TreeNode
                            name='数据表'
                            value={`table&${module.name}&数据表`}
                          >
                            {(module.entities || [])
                              .map((entity) => {
                                const realName = this._getTableNameByNameTemplate(entity);
                                return (
                                  <TreeNode
                                    realName={realName}
                                    key={entity.title}
                                    name={<span>
                                    <Icon
                                      type='fa-table'
                                      style={{ marginRight: 2, color: '#1B8CDC' }}
                                    />{realName}</span>}
                                    value={`entity&${module.name}&${entity.title}`}/>
                                )
                              })}
                          </TreeNode>
                        </TreeNode>);
                      })
                    }
                  </Tree> : <span onClick={this._emptyClick} className='tools-left-tab-body-domain-empty-span'>
                    <Icon type='addfolder'/>无模块点击新增</span>
                }
              </div>
              <div className="tools-left-tab-body-domain"  style={{display: tab === 'domain' ? '' : 'none'}}>
                <Tree onContextMenu={this._onContextMenu} onDoubleClick={this._onDoubleClick} onDrop={this._onDrop}>
                  {
                    ([{name: '数据类型', type: 'datatype'}, {name: '数据库', type: 'database'}]).map((type) => {
                      return (<TreeNode key={type.name} name={type.name} value={`${type.type}&${type.name}`}>
                        {
                          (dataSource.dataTypeDomains &&
                          dataSource.dataTypeDomains[type.type] || [])
                          .map(data => (
                            <TreeNode
                              key={data.code || data.name}
                              realName={`${data.name || data.code}${data.defaultDatabase ? '(默认)' : ''}`}
                              name={<span>
                                <Icon
                                  type={type.type === 'datatype' ? 'fa-viacoin' : 'fa-database'}
                                  style={{ marginRight: 2, color: type.type === 'datatype' ? '#3BB359' : '#E17729' }}
                                />{`${data.name || data.code}${data.defaultDatabase ? '(默认)' : ''}`}</span>
                              }
                              value={`${type.type}&data&${data.code || data.name}`}/>))
                        }
                      </TreeNode>);
                    })
                  }
                </Tree>
              </div>
            </div>
          </div>
          <div className="tools-left-border" onMouseDown={this._onMouseDown}>{}</div>
          <div
            className="tools-right-paint"
            ref={instance => this.instance = instance}
            style={{width: width === 0 ? 'calc(100% - 20px)' : '80%', minWidth: 200}}
          >
            {
              tabs.filter(lefttab => !lefttab.folding).length === 0 ?
                <div
                  style={{
                    textAlign: 'center',
                    width: '100%',
                    height: '100%',
                    paddingTop: 50,
                    userSelect: 'none',
                  }}>
                  双击左侧树图开始工作吧
                </div>
                : <Tab
                  dataSource={this.props.dataSource}
                  leftTabWidth={this.state.leftTabWidth}
                  onClose={this._tabClose}
                  onClick={this._tabHeaderClick}
                  show={this.state.show}
                  tabs={tabs}
                >
                  {tabs.filter(lefttab => !lefttab.folding).map((leftTab) => {
                    return (<TabPane
                      realName={this._getTabRealName(leftTab.title)}
                      icon={leftTab.icon}
                      title={leftTab.title.replace('&', '/')}
                      key={leftTab.key}
                    >{React.cloneElement(leftTab.com, {
                      id: leftTab.key,
                      value: leftTab.value,
                      changeDataType: changeDataType,
                      updateTabs: this._updateTabs,
                      ref: instance => {
                        if (leftTab.value.startsWith('entity&')) {
                          this.tableInstance[leftTab.key] = instance
                        } else {
                          this.relationInstance[leftTab.key] = instance
                        }
                      },
                      dataSource,
                      project,
                      saveProject,
                      show,
                      dataHistory,
                      saveProjectSome,
                      columnOrder,
                      modeChange: this._changeMode,
                      writeFile,
                      openTab: this._onDoubleClick,
                    })}</TabPane>);
                  })}
                </Tab>
            }
          </div>
        </div>
      </div>
    );
  }
}
