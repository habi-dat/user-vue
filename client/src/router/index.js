import Vue from 'vue'
import Router from 'vue-router'
import Profile from '@/pages/user/Profile'
import EditProfile from '@/pages/user/EditProfile'
import Invites from '@/pages/user/Invites'
import SendInvite from '@/pages/user/SendInvite'
import UserList from '@/pages/user/UserList'
import CreateUser from '@/pages/user/CreateUser'
import EditUser from '@/pages/user/EditUser'
import GroupList from '@/pages/group/GroupList'
import Login from '@/pages/Login'
import ErrorPage from '@/pages/ErrorPage'
import axios from 'axios'

Vue.use(Router)

var router = new Router({
  routes: [
    {
      path: '/profile',
      name: 'Profile',
      component: Profile
    },
    {
      path: '/profile/edit',
      name: 'Edit Profile',
      component: EditProfile
    },
    {
      path: '/invites',
      name: 'Invites',
      component: Invites
    },
    {
      path: '/invite',
      name: 'SendInvite',
      component: SendInvite
    },
    {
      path: '/user/list',
      name: 'UserList',
      component: UserList
    },
    {
      path: '/user/create',
      name: 'CreateUser',
      component: CreateUser
    },
    {
      path: '/user/edit',
      name: 'EditUser',
      component: EditUser
    },
    {
      path: '/group/list',
      name: 'GroupList',
      component: GroupList
    },
    {
      path: '/',
      name: 'Login',
      component: Login
    },
    {
      path: '/error',
      name: 'ErrorPage',
      component: ErrorPage
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  // check if server is online
  try {
    if (to.name !== 'ErrorPage') {
      var response = await axios.get('/api/ping')
      if (to.name === 'Login' && !to.query.returnTo && from.name !== 'ErrorPage') {
        next({name: 'Login', query: {returnTo: from.path}})
      } else {
        next();
      }
    } else {
      next()
    }
  } catch(e) {
    next({name: 'ErrorPage'});
  }

})

export default router;
