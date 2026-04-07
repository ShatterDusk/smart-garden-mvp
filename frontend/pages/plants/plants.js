// plants.js - 植物列表页
// 引入 API 服务
const api = require('../../utils/api.js');

Page({
  data: {
    plants: [],
    filteredPlants: [],
    categories: [
      { id: 'all', name: '全部', icon: '🌱' },
      { id: 'succulent', name: '多肉', icon: '🌵' },
      { id: 'flower', name: '花卉', icon: '🌹' },
      { id: 'foliage', name: '绿植', icon: '🌿' }
    ],
    currentCategory: 'all',
    searchKeyword: '',
    sortBy: 'time',
    loading: true,
    emptyText: '还没有添加植物'
  },

  onLoad: function() {
    this.loadPlants();
  },

  onShow: function() {
    this.loadPlants();
  },

  onPullDownRefresh: function() {
    const that = this;
    this.loadPlants().then(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadPlants: function() {
    const that = this;
    this.setData({ loading: true });

    return api.getPlantList().then(function(plants) {
      const emojiMap = {
        succulent: '🌵',
        flower: '🌹',
        foliage: '🌿',
        vegetable: '🥬'
      };
      const categoryNameMap = {
        succulent: '多肉植物',
        flower: '花卉',
        foliage: '绿植',
        vegetable: '蔬菜'
      };

      const formattedPlants = (plants || []).map(function(plant) {
        const createdAt = new Date(plant.createdAt);
        const now = new Date();
        let joinedDays = 0;
        if (createdAt && !isNaN(createdAt.getTime())) {
          joinedDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
          if (joinedDays < 0) joinedDays = 0;
        }

        let healthScore = 80;
        if (plant.latestDiagnosis && typeof plant.latestDiagnosis.healthScore === 'number' && !isNaN(plant.latestDiagnosis.healthScore)) {
          healthScore = plant.latestDiagnosis.healthScore;
        }

        return {
          plantId: plant.plantId,
          nickname: plant.nickname,
          species: plant.species,
          category: plant.plantCategory,
          categoryName: categoryNameMap[plant.plantCategory] || '其他',
          emoji: emojiMap[plant.plantCategory] || '🌱',
          coverImageUrl: plant.coverImageUrl,
          healthScore: healthScore,
          healthStatus: plant.latestDiagnosis ? plant.latestDiagnosis.status : 'healthy',
          hasDevice: !!plant.currentDeviceId,
          joinedDays: joinedDays
        };
      });

      that.setData({
        plants: formattedPlants,
        filteredPlants: formattedPlants,
        loading: false
      });
    }).catch(function(err) {
      console.error('加载植物列表失败:', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },

  switchCategory: function(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentCategory: id });
    this.filterPlants();
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterPlants();
  },

  clearSearch: function() {
    this.setData({ searchKeyword: '' });
    this.filterPlants();
  },

  filterPlants: function() {
    const plants = this.data.plants;
    const currentCategory = this.data.currentCategory;
    const searchKeyword = this.data.searchKeyword;

    let filtered = plants;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(function(plant) {
        return plant.category === currentCategory;
      });
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(function(plant) {
        return plant.nickname.toLowerCase().indexOf(keyword) !== -1 ||
               plant.species.toLowerCase().indexOf(keyword) !== -1;
      });
    }

    this.setData({ filteredPlants: filtered });
  },

  sortPlants: function(e) {
    const type = e.currentTarget.dataset.type;
    const filteredPlants = this.data.filteredPlants;
    const sorted = filteredPlants.concat();

    switch(type) {
      case 'time':
        sorted.sort(function(a, b) {
          return b.joinedDays - a.joinedDays;
        });
        break;
      case 'health':
        sorted.sort(function(a, b) {
          return b.healthScore - a.healthScore;
        });
        break;
      case 'name':
        sorted.sort(function(a, b) {
          return a.nickname.localeCompare(b.nickname);
        });
        break;
    }

    this.setData({
      filteredPlants: sorted,
      sortBy: type
    });
  },

  goToPlantDetail: function(e) {
    const plantId = e.detail.plantId;
    wx.navigateTo({
      url: '/pages/plant-detail/plant-detail?id=' + plantId
    });
  },

  onPlantAction: function(e) {
    const plantId = e.detail.plantId;
    wx.navigateTo({
      url: '/pages/plant-sessions/plant-sessions?plantId=' + plantId
    });
  },

  goToAddPlant: function() {
    wx.navigateTo({
      url: '/pages/add-plant/add-plant'
    });
  },

  onPlantLongPress: function(e) {
    if (!e.detail || !e.detail.plantId) {
      console.log('[plants] 无效的长按事件，忽略');
      return;
    }
    
    const id = e.detail.plantId;
    const name = e.detail.nickname;
    const that = this;

    wx.showActionSheet({
      itemList: ['编辑', '删除', '分享'],
      success: function(res) {
        switch(res.tapIndex) {
          case 0:
            wx.navigateTo({
              url: '/pages/add-plant/add-plant?mode=edit&id=' + id
            });
            break;
          case 1:
            that.deletePlant(id, name);
            break;
          case 2:
            that.sharePlant(id, name);
            break;
        }
      }
    });
  },

  deletePlant: function(id, name) {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除 "' + name + '" 吗？删除后将无法恢复。',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          api.deletePlant(id).then(function() {
            const plants = that.data.plants.filter(function(p) {
              return p.plantId !== id;
            });
            that.setData({
              plants: plants,
              filteredPlants: plants
            });

            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
          }).catch(function(err) {
            console.error('删除植物失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  sharePlant: function(id, name) {
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  goBack: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onShareAppMessage: function() {
    return {
      title: '我的植物花园 - 智能园艺助手',
      path: '/pages/plants/plants'
    };
  }
});
